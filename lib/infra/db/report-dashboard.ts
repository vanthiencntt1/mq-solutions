import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

const facilityWhere = (scope: string[] | null) => (scope === null ? {} : { facilityId: { in: scope } });

export const reportHealth = async (scope: string[] | null, since: Date) => {
  const where = facilityWhere(scope);
  const [facilities, checks, outbox] = await Promise.all([
    prisma.facility.findMany({
      where: scope === null ? {} : { id: { in: scope } },
      select: { id: true, code: true, name: true, health: true, lastOkAt: true },
      orderBy: { name: 'asc' },
      take: 500,
    }),
    prisma.syncLog.groupBy({
      by: ['facilityId', 'ok'],
      where: { ...where, job: 'HEALTH', at: { gte: since } },
      _count: { _all: true },
      _avg: { durationMs: true },
    }),
    prisma.hisOutbox.groupBy({
      by: ['facilityId'],
      where: { ...where, doneAt: null },
      _count: { _all: true },
    }),
  ]);
  return facilities.map((facility) => {
    const rows = checks.filter((row) => row.facilityId === facility.id);
    const total = rows.reduce((sum, row) => sum + row._count._all, 0);
    const errors = rows.filter((row) => !row.ok).reduce((sum, row) => sum + row._count._all, 0);
    const latency = total
      ? rows.reduce((sum, row) => sum + (row._avg.durationMs ?? 0) * row._count._all, 0) / total
      : null;
    return {
      ...facility,
      lastOkAt: facility.lastOkAt?.toISOString() ?? null,
      latencyMs: latency === null ? null : Math.round(latency),
      checks: total,
      errors,
      errorRate: total ? errors / total : 0,
      outboxPending: outbox.find((row) => row.facilityId === facility.id)?._count._all ?? 0,
    };
  });
};

export const reportDashboard = async (scope: string[] | null, start: Date, end: Date, now: Date) => {
  const where = facilityWhere(scope);
  const createdAt = { gte: start, lt: end };
  // exam_date là cột DATE; dùng mốc UTC nửa đêm của ngày Việt Nam để tránh lệch ngày.
  const examDate = {
    gte: new Date(start.getTime() + 7 * 3_600_000),
    lt: new Date(end.getTime() + 7 * 3_600_000),
  };
  const staleAt = new Date(now.getTime() - 30 * 60_000);
  const [
    created,
    exams,
    paid,
    staleHis,
    cancelRequests,
    refundPending,
    paymentMismatch,
    patientInfoMismatch,
    reconcileMismatch,
    outboxPending,
  ] = await Promise.all([
    prisma.appointment.groupBy({
      by: ['status', 'payMethod'],
      where: { ...where, createdAt },
      _count: { _all: true },
    }),
    prisma.appointment.count({ where: { ...where, examDate } }),
    prisma.payment.aggregate({
      where: { ...where, paidAt: createdAt, status: { in: ['PAID', 'REFUND_PENDING', 'REFUNDED'] } },
      _count: { _all: true },
      _sum: { paidAmount: true },
    }),
    prisma.appointment.count({ where: { ...where, status: 'LOI_HIS', updatedAt: { lt: staleAt } } }),
    prisma.appointment.count({ where: { ...where, cancelRequest: true } }),
    prisma.appointment.count({ where: { ...where, status: 'CHO_HOAN_TIEN' } }),
    prisma.payment.count({ where: { ...where, status: { in: ['AMOUNT_MISMATCH', 'UNMATCHED'] } } }),
    prisma.appointment.count({
      where: {
        ...where,
        status: 'LOI_HIS',
        OR: [
          { hisError: { contains: 'khớp', mode: 'insensitive' } },
          { hisError: { contains: 'mismatch', mode: 'insensitive' } },
        ],
      },
    }),
    prisma.reconcileBatch.count({
      where: {
        ...where,
        startedAt: { gte: new Date(now.getTime() - 7 * 86_400_000) },
        OR: [{ missingInHis: { gt: 0 } }, { missingInWeb: { gt: 0 } }, { amountDiff: { not: 0 } }],
      },
    }),
    prisma.hisOutbox.count({ where: { ...where, doneAt: null } }),
  ]);
  const newBookings = created.reduce((sum, row) => sum + row._count._all, 0);
  const hisErrors = created
    .filter((row) => row.status === 'LOI_HIS')
    .reduce((sum, row) => sum + row._count._all, 0);
  return {
    newBookings,
    examsToday: exams,
    // A10 mục 1: đếm giao dịch thật sự đã trả trong ngày, không tính phiếu chọn online còn chờ tiền.
    onlineBookings: paid._count._all,
    atFacilityBookings: created
      .filter((row) => row.payMethod === 'AT_FACILITY')
      .reduce((sum, row) => sum + row._count._all, 0),
    onlineVnd: Number(paid._sum.paidAmount ?? new Prisma.Decimal(0)),
    hisErrors,
    hisErrorRate: newBookings ? hisErrors / newBookings : 0,
    tasks: {
      staleHis,
      cancelRequests,
      refundPending,
      paymentMismatch,
      patientInfoMismatch,
      reconcileMismatch,
      outboxPending,
    },
  };
};
