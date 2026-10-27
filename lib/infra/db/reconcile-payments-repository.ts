import { Prisma, type PaymentStatus } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import type { PaymentQuery, PaymentRepository, PaymentRow } from '@/lib/domain/payment/reconcile-contracts';
import { prisma } from './prisma';

const paymentInclude = {
  facility: { select: { name: true } },
  appointment: { select: { code: true, status: true } },
} as const;

type PaymentRecord = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;
function rowView(row: PaymentRecord): PaymentRow {
  return {
    id: row.id,
    facilityId: row.facilityId,
    facilityName: row.facility.name,
    orderCode: row.orderCode,
    providerTxnId: row.providerTxnId,
    amount: Number(row.amount),
    paidAmount: row.paidAmount === null ? null : Number(row.paidAmount),
    status: row.status,
    appointmentCode: row.appointment?.code ?? null,
    appointmentStatus: row.appointment?.status ?? null,
    refundBy: row.refundBy,
    refundApprovedBy: row.refundApprovedBy,
    refundRef: row.refundRef,
    createdAt: row.createdAt,
    paidAt: row.paidAt,
    refundedAt: row.refundedAt,
  };
}

function scopedWhere(id: string, scope: string[] | null): Prisma.PaymentWhereInput {
  return { id, ...(scope === null ? {} : { facilityId: { in: scope } }) };
}

function listWhere(query: PaymentQuery, scope: string[] | null): Prisma.PaymentWhereInput {
  const date = query.date ? fromZonedTime(`${query.date}T00:00:00`, 'Asia/Ho_Chi_Minh') : undefined;
  const end = date ? new Date(date.getTime() + 86_400_000) : undefined;
  return {
    facilityId: query.facilityId ?? (scope === null ? undefined : { in: scope }),
    status: query.status,
    ...(date && end
      ? { OR: [{ paidAt: { gte: date, lt: end } }, { paidAt: null, createdAt: { gte: date, lt: end } }] }
      : {}),
  };
}

async function read(id: string, scope: string[] | null) {
  const row = await prisma.payment.findFirst({ where: scopedWhere(id, scope), include: paymentInclude });
  return row ? rowView(row) : null;
}

const RefundDiff = z.object({ amount: z.number().int().positive(), note: z.string() });

export const prismaReconcilePaymentsRepository: PaymentRepository = {
  async list(query, scope) {
    const where = listWhere(query, scope);
    const [rows, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: paymentInclude,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.payment.count({ where }),
    ]);
    return { rows: rows.map(rowView), total };
  },
  facilities: (scope) =>
    prisma.facility.findMany({
      where: scope === null ? {} : { id: { in: scope } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  find: read,
  async refundEmail(id, scope) {
    const row = await prisma.payment.findFirst({
      where: scopedWhere(id, scope),
      select: { appointment: { select: { account: { select: { email: true } } } } },
    });
    return row?.appointment?.account.email ?? null;
  },
  async match(id, appointmentCode, actorId, scope) {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: scopedWhere(id, scope) });
      if (!payment) throw new AppError('NOT_FOUND');
      if (payment.status !== 'UNMATCHED' || !payment.providerTxnId || !payment.paidAmount)
        throw new AppError('A07_MATCH_STATE');
      const booking = await tx.appointment.findUnique({
        where: { code: appointmentCode },
        include: { payment: true },
      });
      if (!booking || booking.facilityId !== payment.facilityId || booking.payMethod !== 'ONLINE')
        throw new AppError('A07_MATCH_FACILITY');
      if (!['CHO_THANH_TOAN', 'QUA_HAN'].includes(booking.status)) throw new AppError('A07_MATCH_STATE');
      if (booking.payment && booking.payment.status !== 'PENDING' && booking.payment.status !== 'EXPIRED')
        throw new AppError('A07_MATCH_STATE');
      // A07 mục 2: giữ dòng thanh toán cũ để truy vết, chỉ tháo liên kết 1–1 trước khi gán tiền thực nhận.
      if (booking.payment)
        await tx.payment.update({
          where: { id: booking.payment.id },
          data: { appointmentId: null, orderCode: null, status: 'EXPIRED' },
        });
      const exact = payment.paidAmount.equals(booking.amount);
      await tx.payment.update({
        where: { id },
        data: {
          appointmentId: booking.id,
          orderCode: booking.code,
          amount: booking.amount,
          status: exact ? (booking.status === 'QUA_HAN' ? 'REFUND_PENDING' : 'PAID') : 'AMOUNT_MISMATCH',
        },
      });
      if (exact) {
        const expired = booking.status === 'QUA_HAN';
        await tx.appointment.update({
          where: { id: booking.id },
          data: {
            status: expired ? 'CHO_HOAN_TIEN' : 'DA_THANH_TOAN',
            paidAt: payment.paidAt ?? new Date(),
          },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: booking.id,
            fromStatus: booking.status,
            toStatus: expired ? 'CHO_HOAN_TIEN' : 'DA_THANH_TOAN',
            actorType: 'ADMIN',
            actorId,
          },
        });
        // C07 mục 4: số của phiếu quá hạn có thể đã cấp lại, chỉ ghi nhận khoản cần hoàn.
        if (!expired) {
          const outbox = await tx.hisOutbox.findFirst({ where: { appointmentId: booking.id, doneAt: null } });
          if (!outbox)
            await tx.hisOutbox.create({
              data: {
                facilityId: booking.facilityId,
                appointmentId: booking.id,
                command: booking.isNewPatient ? 'POST_PATIENT_AND_BOOKING' : 'POST_BOOKING',
                nextRunAt: new Date(),
              },
            });
        }
      }
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'PAYMENT_MATCH',
          module: 'A07',
          facilityId: payment.facilityId,
          target: id,
          diff: { appointmentCode: booking.code, exact, replacedPaymentId: booking.payment?.id ?? null },
        },
      });
    });
    return (await read(id, scope))!;
  },
  async requestRefund(id, amount, note, actorId, scope) {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findFirst({ where: scopedWhere(id, scope) });
      if (
        !payment ||
        !['PAID', 'AMOUNT_MISMATCH', 'UNMATCHED', 'REFUND_PENDING'].includes(payment.status) ||
        payment.refundRef ||
        (payment.status === 'REFUND_PENDING' && payment.refundBy)
      )
        throw new AppError('A07_REFUND_STATE');
      const received = Number(payment.paidAmount ?? 0);
      if (amount > received || (amount < received && payment.status !== 'AMOUNT_MISMATCH'))
        throw new AppError('A07_REFUND_AMOUNT');
      const appointment = payment.appointmentId
        ? await tx.appointment.findUnique({
            where: { id: payment.appointmentId },
            select: { status: true },
          })
        : null;
      if (payment.status === 'PAID' && !['CHO_HOAN_TIEN', 'DA_HUY'].includes(appointment?.status ?? ''))
        throw new AppError('A07_REFUND_STATE');
      if (
        payment.status === 'AMOUNT_MISMATCH' &&
        appointment &&
        amount !== received - Number(payment.amount) &&
        amount !== received
      )
        throw new AppError('A07_REFUND_AMOUNT');
      await tx.payment.update({
        where: { id },
        data: { status: 'REFUND_PENDING', refundBy: actorId, refundApprovedBy: null },
      });
      if (payment.appointmentId)
        await tx.appointment.update({
          where: { id: payment.appointmentId },
          data: { status: 'CHO_HOAN_TIEN' },
        });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'REFUND_REQUEST',
          module: 'A07',
          facilityId: payment.facilityId,
          target: id,
          diff: {
            amount,
            note,
            previousStatus: payment.status,
            previousAppointmentStatus: appointment?.status ?? null,
          },
        },
      });
    });
    return (await read(id, scope))!;
  },
  async refundRequest(id) {
    const log = await prisma.auditLog.findFirst({
      where: { action: 'REFUND_REQUEST', module: 'A07', target: id },
      orderBy: { at: 'desc' },
      select: { diff: true },
    });
    const parsed = RefundDiff.safeParse(log?.diff);
    return parsed.success ? parsed.data : null;
  },
  async approveRefund(id, actorId, scope) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.payment.findFirst({ where: scopedWhere(id, scope) });
      if (!row || row.status !== 'REFUND_PENDING' || row.refundBy === actorId || row.refundApprovedBy)
        throw new AppError('A07_REFUND_STATE');
      await tx.payment.update({ where: { id }, data: { refundApprovedBy: actorId } });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'REFUND_APPROVE',
          module: 'A07',
          facilityId: row.facilityId,
          target: id,
        },
      });
    });
    return (await read(id, scope))!;
  },
  async completeRefund(id, input, actorId, scope) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.payment.findFirst({ where: scopedWhere(id, scope) });
      if (!row || row.status !== 'REFUND_PENDING') throw new AppError('A07_REFUND_STATE');
      if (input.amount > 2_000_000 && (!row.refundApprovedBy || row.refundApprovedBy === row.refundBy))
        throw new AppError('A07_REFUND_APPROVAL_REQUIRED');
      const partial = input.amount < Number(row.paidAmount ?? 0);
      const nextStatus: PaymentStatus = partial ? 'PAID' : 'REFUNDED';
      await tx.payment.update({
        where: { id },
        data: {
          status: nextStatus,
          refundedAt: input.refundedAt,
          refundRef: input.refundRef,
        },
      });
      if (row.appointmentId) {
        const booking = await tx.appointment.findUniqueOrThrow({ where: { id: row.appointmentId } });
        // C07 mục 6: hoàn phần tiền thừa không làm mất trạng thái khám trước yêu cầu hoàn.
        const requestLog = partial
          ? await tx.auditLog.findFirst({
              where: { action: 'REFUND_REQUEST', module: 'A07', target: id },
              orderBy: { at: 'desc' },
              select: { diff: true },
            })
          : null;
        const previous = z
          .object({ previousAppointmentStatus: z.string().nullable() })
          .safeParse(requestLog?.diff);
        const appointmentStatus =
          partial && previous.success && previous.data.previousAppointmentStatus === 'DA_CO_STT'
            ? 'DA_CO_STT'
            : partial && previous.success && previous.data.previousAppointmentStatus === 'DA_KHAM'
              ? 'DA_KHAM'
              : partial
                ? 'DA_THANH_TOAN'
                : 'DA_HOAN_TIEN';
        await tx.appointment.update({
          where: { id: row.appointmentId },
          data: { status: appointmentStatus },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: row.appointmentId,
            fromStatus: booking.status,
            toStatus: appointmentStatus,
            actorType: 'ADMIN',
            actorId,
          },
        });
        await tx.notification.create({
          data: {
            accountId: booking.accountId,
            type: 'REFUNDED',
            title: 'Đã chuyển khoản hoàn tiền',
            body: `Cơ sở đã hoàn ${input.amount.toLocaleString('vi-VN')}đ. Mã giao dịch: ${input.refundRef}.`,
            link: `/tai-khoan/phieu-kham/${booking.code}`,
          },
        });
      }
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'REFUND',
          module: 'A07',
          facilityId: row.facilityId,
          target: id,
          diff: { amount: input.amount, refundRef: input.refundRef, note: input.note ?? '' },
        },
      });
    });
    return (await read(id, scope))!;
  },
};
