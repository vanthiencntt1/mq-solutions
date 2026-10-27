import { prisma } from './prisma';

const LIMIT = 500;

export const prismaReportAlerts = {
  async candidates(now: Date) {
    const fiveMinutes = new Date(now.getTime() - 5 * 60_000);
    const thirtyMinutes = new Date(now.getTime() - 30 * 60_000);
    const oneHour = new Date(now.getTime() - 3_600_000);
    const [down, stale, failed] = await Promise.all([
      // A10 mục 3: last_ok_at cũ không chứng minh HIS đã DOWN đủ 5 phút.
      // Cần một lần kiểm tra lỗi trước ngưỡng và sau lần OK cuối.
      prisma.$queryRaw<{ id: string; name: string }[]>`
        SELECT f.id, f.name FROM facility f
        WHERE f.status = 'ACTIVE' AND f.health = 'DOWN'
          AND COALESCE(f.last_ok_at, f.created_at) < ${fiveMinutes}
          AND EXISTS (
            SELECT 1 FROM sync_log s
            WHERE s.facility_id = f.id AND s.job = 'HEALTH' AND s.ok = false
              AND s.at <= ${fiveMinutes} AND s.at > COALESCE(f.last_ok_at, f.created_at)
          )
        LIMIT ${LIMIT}`,
      prisma.appointment.groupBy({
        by: ['facilityId'],
        where: { status: 'LOI_HIS', updatedAt: { lt: thirtyMinutes } },
        _count: { _all: true },
      }),
      prisma.syncLog.findMany({
        where: { job: 'RECONCILE', ok: false, at: { gte: oneHour } },
        select: { facilityId: true, facility: { select: { name: true } } },
        distinct: ['facilityId'],
        orderBy: { at: 'desc' },
        take: LIMIT,
      }),
    ]);
    const staleIds = stale.map((row) => row.facilityId);
    const names = staleIds.length
      ? await prisma.facility.findMany({
          where: { id: { in: staleIds } },
          select: { id: true, name: true },
          take: LIMIT,
        })
      : [];
    return [
      ...down.map((row) => ({
        kind: 'DOWN' as const,
        facilityId: row.id,
        facilityName: row.name,
        detail: 'ApiDatKham mất kết nối trên 5 phút.',
      })),
      ...stale.map((row) => ({
        kind: 'HIS_STALE' as const,
        facilityId: row.facilityId,
        facilityName: names.find((name) => name.id === row.facilityId)?.name ?? 'Cơ sở',
        detail: `${row._count._all} phiếu lỗi HIS quá 30 phút.`,
      })),
      ...failed.map((row) => ({
        kind: 'RECONCILE_FAILED' as const,
        facilityId: row.facilityId,
        facilityName: row.facility.name,
        detail: 'Job đối soát có lỗi trong 1 giờ qua.',
      })),
    ];
  },

  async recipients(facilityId: string) {
    const users = await prisma.adminUser.findMany({
      where: {
        active: true,
        OR: [{ facilityId: null }, { facilityId }],
        role: {
          OR: [
            { name: 'SUPER_ADMIN' },
            { permissions: { has: 'monitor:read' } },
            { permissions: { has: 'monitor:*' } },
            { permissions: { has: '*' } },
          ],
        },
      },
      select: { email: true },
      take: LIMIT,
    });
    return users.map((user) => user.email);
  },
};
