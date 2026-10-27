import { Prisma } from '@prisma/client';
import type {
  IncomingTransfer,
  PaymentRecord,
  PaymentRepository,
  RecordTransferResult,
} from '@/lib/domain/payment/ports';
import { classifyTransfer, paymentDeadline } from '@/lib/domain/payment/types';
import { AppError } from '@/lib/domain/errors';
import { prisma } from './prisma';

const facilitySelect = {
  id: true,
  code: true,
  payOptions: true,
  bankCode: true,
  bankAccountNo: true,
  bankAccountName: true,
  webhookKeyRef: true,
} as const;

const paymentInclude = {
  appointment: {
    include: { facility: { select: { code: true, name: true } } },
  },
} as const;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

function toRecord(row: PaymentRow): PaymentRecord | null {
  const a = row.appointment;
  if (!a) return null;
  return {
    id: row.id,
    code: a.code,
    accountId: a.accountId,
    facilityId: row.facilityId,
    facilityCode: a.facility.code,
    facilityName: a.facility.name,
    roomHisId: a.roomHisId,
    examDate: a.examDate.toISOString().slice(0, 10),
    bookingNumber: a.bookingNumber,
    bookingApi: a.bookingApi,
    payMethod: a.payMethod,
    appointmentStatus: a.status,
    paymentStatus: row.status,
    amount: Number(row.amount),
    createdAt: row.createdAt,
    providerTxnId: row.providerTxnId,
    hisBookingId: a.hisBookingId,
  };
}

async function find(code: string): Promise<PaymentRecord | null> {
  const row = await prisma.payment.findUnique({ where: { orderCode: code }, include: paymentInclude });
  return row ? toRecord(row) : null;
}

const sanitized = (input: IncomingTransfer, reason: string): Prisma.InputJsonValue => ({
  receivedOrderCode: input.orderCode,
  referenceCode: input.bankRef,
  transferAmount: input.amount,
  reason,
});

async function unmatched(tx: Prisma.TransactionClient, input: IncomingTransfer, reason: string) {
  await tx.payment.create({
    data: {
      facilityId: input.facilityId,
      amount: input.amount,
      paidAmount: input.amount,
      providerTxnId: input.providerTxnId,
      bankRef: input.bankRef,
      status: 'UNMATCHED',
      paidAt: input.at,
      rawWebhook: sanitized(input, reason),
    },
  });
}

async function recordTransfer(input: IncomingTransfer): Promise<RecordTransferResult> {
  try {
    return await prisma.$transaction(
      async (tx) => {
        if (await tx.payment.findUnique({ where: { providerTxnId: input.providerTxnId } }))
          return { kind: 'duplicate' };
        const payment = input.orderCode
          ? await tx.payment.findUnique({ where: { orderCode: input.orderCode }, include: paymentInclude })
          : null;
        const appointment = payment?.appointment;
        if (!payment || !appointment || payment.facilityId !== input.facilityId) {
          await unmatched(tx, input, 'ORDER_NOT_IN_FACILITY');
          return { kind: 'unmatched' };
        }
        if (payment.providerTxnId || !['PENDING', 'EXPIRED'].includes(payment.status)) {
          await unmatched(tx, input, 'ORDER_ALREADY_PROCESSED');
          return { kind: 'unmatched' };
        }
        const decision = classifyTransfer(Number(payment.amount), input.amount, input.slotAvailable);
        if (decision === 'mismatch') {
          await tx.payment.update({
            where: { id: payment.id },
            data: {
              providerTxnId: input.providerTxnId,
              bankRef: input.bankRef,
              paidAmount: input.amount,
              paidAt: input.at,
              status: 'AMOUNT_MISMATCH',
              rawWebhook: sanitized(input, 'AMOUNT_MISMATCH'),
            },
          });
          return { kind: 'mismatch' };
        }
        const eligible =
          appointment.bookingApi === 'PAID'
            ? ['CHO_THANH_TOAN', 'QUA_HAN'].includes(appointment.status)
            : appointment.status === 'DA_CO_STT';
        const refund = decision === 'refund' || !eligible;
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerTxnId: input.providerTxnId,
            bankRef: input.bankRef,
            paidAmount: input.amount,
            paidAt: input.at,
            status: refund ? 'REFUND_PENDING' : 'PAID',
            rawWebhook: sanitized(input, refund ? 'LATE_SLOT_TAKEN' : 'MATCHED'),
          },
        });
        const nextStatus = refund
          ? 'CHO_HOAN_TIEN'
          : appointment.bookingApi === 'UNPAID'
            ? 'DANG_GUI_HIS'
            : 'DA_THANH_TOAN';
        await tx.appointment.update({
          where: { id: appointment.id },
          data: { status: nextStatus, paidAt: input.at },
        });
        await tx.appointmentEvent.create({
          data: {
            appointmentId: appointment.id,
            fromStatus: appointment.status,
            toStatus: nextStatus,
            actorType: 'SYSTEM',
            note: refund ? 'Tiền đến sau hạn, số đã được dùng' : 'SePay xác nhận tiền vào',
          },
        });
        if (refund) return { kind: 'refund' };
        await tx.hisOutbox.create({
          data: {
            appointmentId: appointment.id,
            facilityId: input.facilityId,
            command: appointment.bookingApi === 'UNPAID' ? 'COMPLETE_PAYMENT' : 'POST_BOOKING_PAID',
            nextRunAt: new Date(input.at.getTime() + 60_000),
          },
        });
        return { kind: 'paid', code: appointment.code, bookingApi: appointment.bookingApi };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      return { kind: 'duplicate' };
    throw error;
  }
}

export const prismaPaymentRepository: PaymentRepository = {
  facilityByCode: (code) => prisma.facility.findUnique({ where: { code }, select: facilitySelect }),
  facilityById: (id) => prisma.facility.findUnique({ where: { id }, select: facilitySelect }),
  find,
  async createForUnpaid(code, accountId, at) {
    const appointment = await prisma.appointment.findUnique({
      where: { code },
      include: { facility: { select: facilitySelect } },
    });
    if (!appointment || appointment.accountId !== accountId) throw new AppError('NOT_FOUND');
    if (appointment.bookingApi !== 'UNPAID' || appointment.status !== 'DA_CO_STT')
      throw new AppError('PAYMENT_NOT_AVAILABLE');
    if (
      !appointment.facility.payOptions.includes('ONLINE') ||
      !appointment.facility.bankCode ||
      !appointment.facility.bankAccountNo ||
      !appointment.facility.bankAccountName ||
      !appointment.facility.webhookKeyRef
    )
      throw new AppError('PAYMENT_NOT_CONFIGURED');
    try {
      await prisma.payment.create({
        data: {
          appointmentId: appointment.id,
          facilityId: appointment.facilityId,
          orderCode: code,
          amount: appointment.amount,
          status: 'PENDING',
          createdAt: at,
        },
      });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
    }
    return (await find(code))!;
  },
  record: recordTransfer,
  async expireDue(before, limit) {
    const rows = await prisma.payment.findMany({
      where: {
        createdAt: { lte: before },
        OR: [
          { status: 'PENDING' },
          { status: 'AMOUNT_MISMATCH', appointment: { status: 'CHO_THANH_TOAN' } },
        ],
      },
      include: paymentInclude,
      orderBy: { createdAt: 'asc' },
      take: limit,
    });
    return rows.map(toRecord).filter((row): row is PaymentRecord => row !== null);
  },
  async markExpired(code, at) {
    try {
      return await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { orderCode: code }, include: paymentInclude });
      if (!payment?.appointment) return false;
      if (paymentDeadline(payment.createdAt) > at) return false;
      if (!['PENDING', 'AMOUNT_MISMATCH'].includes(payment.status)) return false;
      if (payment.appointment.bookingApi === 'UNPAID' && payment.appointment.status === 'DA_CO_STT') {
        if (payment.status !== 'PENDING') return false;
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } });
        return true;
      }
      if (payment.appointment.status !== 'CHO_THANH_TOAN') return false;
      if (payment.status === 'PENDING')
        await tx.payment.update({ where: { id: payment.id }, data: { status: 'EXPIRED' } });
      await tx.appointment.update({ where: { id: payment.appointment.id }, data: { status: 'QUA_HAN' } });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: payment.appointment.id,
          fromStatus: 'CHO_THANH_TOAN',
          toStatus: 'QUA_HAN',
          actorType: 'SYSTEM',
        },
      });
      return true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      // Webhook thắng cuộc đua với job: vòng tiếp theo đọc trạng thái mới.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') return false;
      throw error;
    }
  },
  async completePaymentDue(before, limit) {
    const rows = await prisma.hisOutbox.findMany({
      where: { command: 'COMPLETE_PAYMENT', doneAt: null, nextRunAt: { lte: before } },
      select: { id: true, attempts: true, appointment: { select: { code: true } } },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
    });
    return rows.map((row) => ({ id: row.id, code: row.appointment.code, attempts: row.attempts }));
  },
  async completePaymentOutbox(code) {
    const row = await prisma.hisOutbox.findFirst({
      where: { command: 'COMPLETE_PAYMENT', doneAt: null, appointment: { code } },
      select: { id: true, attempts: true },
      orderBy: { createdAt: 'desc' },
    });
    return row ? { id: row.id, code, attempts: row.attempts } : null;
  },
  async completePaymentDone(id, code) {
    await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUniqueOrThrow({ where: { code } });
      await tx.appointment.update({ where: { code }, data: { status: 'DA_CO_STT', hisError: null } });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: appointment.id,
          fromStatus: appointment.status,
          toStatus: 'DA_CO_STT',
          actorType: 'HIS',
        },
      });
      await tx.hisOutbox.update({ where: { id }, data: { doneAt: new Date() } });
    });
  },
  async completePaymentFailed(id, code, attempts, error) {
    await prisma.$transaction(async (tx) => {
      await tx.appointment.update({ where: { code }, data: { status: 'LOI_HIS', hisError: error } });
      await tx.hisOutbox.update({
        where: { id },
        data: {
          attempts,
          lastError: error,
          nextRunAt: new Date(Date.now() + Math.min(2 ** Math.min(attempts, 8) * 60_000, 6 * 60 * 60_000)),
        },
      });
    });
  },
};
