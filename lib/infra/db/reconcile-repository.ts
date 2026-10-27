import { Prisma } from '@prisma/client';
import { fromZonedTime } from 'date-fns-tz';
import { z } from 'zod';
import type { WebBooking } from '@/lib/domain/payment/reconcile';
import type {
  BankTotals,
  ReconcileBatchView,
  ReconcileQuery,
  ReconcileRepository,
} from '@/lib/domain/payment/reconcile-contracts';
import { prisma } from './prisma';

const issueSchema = z.object({
  kind: z.enum([
    'MISSING_IN_HIS',
    'MISSING_IN_WEB',
    'STT_MISMATCH',
    'AMOUNT_MISMATCH',
    'HIS_STATUS_CHANGED',
    'PAYMENT_MISMATCH',
  ]),
  appointmentId: z.string().optional(),
  appointmentCode: z.string().optional(),
  hisKey: z.string().optional(),
  webValue: z.union([z.number(), z.string()]).optional(),
  hisValue: z.union([z.number(), z.string()]).optional(),
});
const detailSchema = z.object({
  issues: z.array(issueSchema),
  bank: z.object({
    incoming: z.number(),
    booked: z.number(),
    difference: z.number(),
  }),
});
const batchInclude = { facility: { select: { name: true } } } as const;
type BatchRecord = Prisma.ReconcileBatchGetPayload<{ include: typeof batchInclude }>;

function batchView(row: BatchRecord): ReconcileBatchView {
  const detail =
    row.detail === null
      ? { issues: [], bank: { incoming: 0, booked: 0, difference: 0 } }
      : detailSchema.parse(row.detail);
  return {
    id: row.id,
    facilityId: row.facilityId,
    facilityName: row.facility.name,
    examDate: row.examDate.toISOString().slice(0, 10),
    matched: row.matched,
    missingInHis: row.missingInHis,
    missingInWeb: row.missingInWeb,
    statusChanged: row.statusChanged,
    amountDiff: row.amountDiff,
    issues: detail.issues,
    bank: detail.bank,
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

function day(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

async function bankTotals(facilityId: string, date: string): Promise<BankTotals> {
  // A07 mục 3: webhook SePay được nhóm theo ngày giao dịch Việt Nam, không theo nửa đêm UTC.
  const start = fromZonedTime(`${date}T00:00:00`, 'Asia/Ho_Chi_Minh');
  const end = new Date(start.getTime() + 86_400_000);
  const payments = await prisma.payment.findMany({
    where: {
      facilityId,
      providerTxnId: { not: null },
      OR: [{ paidAt: { gte: start, lt: end } }, { paidAt: null, createdAt: { gte: start, lt: end } }],
    },
    select: { paidAmount: true, amount: true, appointmentId: true, status: true },
  });
  const incoming = payments.reduce((sum, row) => sum + Number(row.paidAmount ?? 0), 0);
  const booked = payments.reduce(
    (sum, row) =>
      sum +
      (row.appointmentId && row.status === 'PAID' && row.paidAmount?.equals(row.amount)
        ? Number(row.paidAmount)
        : 0),
    0,
  );
  return { incoming, booked, difference: incoming - booked };
}

export const prismaReconcileRepository: ReconcileRepository = {
  dueFacilities: () =>
    prisma.facility.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, reconcileTime: true },
      take: 200,
    }),
  facilities: (scope) =>
    prisma.facility.findMany({
      where: scope === null ? {} : { id: { in: scope } },
      select: { id: true, name: true, reconcileTime: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  async alertRecipients(facilityId) {
    const rows = await prisma.adminUser.findMany({
      where: {
        active: true,
        OR: [{ facilityId }, { facilityId: null }],
        role: {
          OR: [{ name: 'SUPER_ADMIN' }, { permissions: { hasSome: ['payment:read', 'monitor:read', '*'] } }],
        },
      },
      select: { email: true },
      take: 100,
    });
    return [...new Set(rows.map((row) => row.email))];
  },
  async bookings(facilityId, examDate): Promise<WebBooking[]> {
    const rows = await prisma.appointment.findMany({
      where: { facilityId, examDate: day(examDate) },
      select: {
        id: true,
        code: true,
        hisId: true,
        hisBookingId: true,
        bookingApi: true,
        payMethod: true,
        status: true,
        stt: true,
        amount: true,
        payment: { select: { status: true, paidAmount: true } },
      },
      take: 10_000,
    });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      hisId: String(row.hisId),
      hisBookingId: row.hisBookingId,
      bookingApi: row.bookingApi,
      payMethod: row.payMethod,
      status: row.status,
      stt: row.stt,
      amount: Number(row.amount),
      paymentStatus: row.payment?.status ?? null,
      paidAmount:
        row.payment?.paidAmount === null || row.payment === null ? null : Number(row.payment.paidAmount),
    }));
  },
  bankTotals,
  async save(input) {
    const { result, facilityId, examDate, startedAt, finishedAt, bank } = input;
    const detail: Prisma.InputJsonValue = {
      issues: result.issues.map((issue) => ({ ...issue })),
      bank: { ...bank },
    };
    await prisma.$transaction(
      async (tx) => {
        for (const action of result.actions) {
          const before = await tx.appointment.findUniqueOrThrow({ where: { id: action.appointmentId } });
          await tx.appointment.update({
            where: { id: action.appointmentId },
            data: {
              reconciledAt: action.reconciled ? finishedAt : null,
              ...(action.stt === undefined ? {} : { stt: action.stt, sttAt: finishedAt }),
              ...(action.status ? { status: action.status } : {}),
            },
          });
          if (action.status && action.status !== before.status)
            await tx.appointmentEvent.create({
              data: {
                appointmentId: action.appointmentId,
                fromStatus: before.status,
                toStatus: action.status,
                actorType: 'HIS',
                note: 'C09 đối soát cuối ngày',
              },
            });
          if (action.enqueueOutbox) {
            const pending = await tx.hisOutbox.findFirst({
              where: { appointmentId: action.appointmentId, doneAt: null },
            });
            if (!pending)
              await tx.hisOutbox.create({
                data: {
                  facilityId,
                  appointmentId: action.appointmentId,
                  command: before.isNewPatient ? 'POST_PATIENT_AND_BOOKING' : 'POST_BOOKING',
                  nextRunAt: finishedAt,
                },
              });
          }
        }
        await tx.reconcileBatch.upsert({
          where: { facilityId_examDate: { facilityId, examDate: day(examDate) } },
          create: {
            facilityId,
            examDate: day(examDate),
            startedAt,
            finishedAt,
            matched: result.matched,
            missingInHis: result.missingInHis,
            missingInWeb: result.missingInWeb,
            statusChanged: result.statusChanged,
            amountDiff: result.amountDiff,
            detail,
          },
          update: {
            startedAt,
            finishedAt,
            matched: result.matched,
            missingInHis: result.missingInHis,
            missingInWeb: result.missingInWeb,
            statusChanged: result.statusChanged,
            amountDiff: result.amountDiff,
            detail,
          },
        });
      },
      { timeout: 30_000 },
    );
    const row = await prisma.reconcileBatch.findUniqueOrThrow({
      where: { facilityId_examDate: { facilityId, examDate: day(examDate) } },
      include: batchInclude,
    });
    return batchView(row);
  },
  async hasCompleted(facilityId, date) {
    return (
      (await prisma.reconcileBatch.count({
        where: { facilityId, examDate: day(date), finishedAt: { not: null } },
      })) > 0
    );
  },
  async list(query: ReconcileQuery, scope) {
    const where: Prisma.ReconcileBatchWhereInput = {
      facilityId: query.facilityId ?? (scope === null ? undefined : { in: scope }),
      examDate: query.date ? day(query.date) : undefined,
    };
    const [rows, total] = await Promise.all([
      prisma.reconcileBatch.findMany({
        where,
        include: batchInclude,
        orderBy: { examDate: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.reconcileBatch.count({ where }),
    ]);
    return { rows: rows.map(batchView), total };
  },
  async log(facilityId, ok, updated, durationMs, error) {
    await prisma.syncLog.create({ data: { facilityId, job: 'RECONCILE', ok, updated, durationMs, error } });
  },
};
