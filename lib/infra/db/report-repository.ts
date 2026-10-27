import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/domain/errors';
import { prisma } from './prisma';
import { reportDashboard, reportHealth } from './report-dashboard';
import type { DbBookingRow, DbReportQuery, DbRevenueRow } from './report-types';

type RawBooking = Omit<DbBookingRow, 'period' | 'bookings' | 'cancelled' | 'attended' | 'hisErrors'> & {
  period: Date;
  bookings: bigint;
  cancelled: bigint;
  attended: bigint;
  hisErrors: bigint;
};
type RawRevenue = Omit<DbRevenueRow, 'day' | 'onlineVnd' | 'refundedVnd'> & {
  day: Date;
  onlineVnd: Prisma.Decimal;
  refundedVnd: Prisma.Decimal;
};

function bounds(query: DbReportQuery) {
  const from = new Date(`${query.from}T00:00:00+07:00`);
  const to = new Date(Date.parse(`${query.to}T00:00:00+07:00`) + 86_400_000);
  return { from, to };
}

function scopeSql(scope: string[] | null, column: string) {
  if (scope === null) return Prisma.empty;
  // A10 mục 2: mảng rỗng không bao giờ được hiểu là toàn hệ thống.
  if (scope.length === 0) return Prisma.sql`AND FALSE`;
  return Prisma.sql`AND ${Prisma.raw(column)} IN (${Prisma.join(scope.map((id) => Prisma.sql`${id}::uuid`))})`;
}

function boundedRows<T>(rows: T[]): T[] {
  if (rows.length > 10_000) throw new AppError('A10_REPORT_TOO_LARGE');
  return rows;
}

export const prismaReportRepository = {
  async bookings(query: DbReportQuery, scope: string[] | null) {
    const { from, to } = bounds(query);
    const rows = await prisma.$queryRaw<RawBooking[]>`
      SELECT date_trunc(${query.period}, timezone('Asia/Ho_Chi_Minh', a.created_at))::date AS period,
        f.id AS "facilityId", f.name AS "facilityName", a.specialty_name AS "specialtyName",
        a.object_type::text AS "objectType", a.pay_method::text AS "payMethod",
        COUNT(*)::bigint AS bookings,
        -- A10 mục 2: phiếu chờ hoàn tiền đã hủy lịch, dù tiền chưa hoàn xong.
        COUNT(*) FILTER (WHERE a.status IN ('DA_HUY', 'CHO_HOAN_TIEN', 'DA_HOAN_TIEN'))::bigint AS cancelled,
        COUNT(*) FILTER (WHERE a.status = 'DA_KHAM')::bigint AS attended,
        COUNT(*) FILTER (WHERE a.status = 'LOI_HIS')::bigint AS "hisErrors"
      FROM appointment a JOIN facility f ON f.id = a.facility_id
      WHERE a.created_at >= ${from} AND a.created_at < ${to} ${scopeSql(scope, 'a.facility_id')}
      GROUP BY 1, f.id, f.name, a.specialty_name, a.object_type, a.pay_method
      ORDER BY 1 DESC, f.name, a.specialty_name
      LIMIT 10001`;
    return boundedRows(rows).map((row) => ({
      ...row,
      period: row.period.toISOString().slice(0, 10),
      bookings: Number(row.bookings),
      cancelled: Number(row.cancelled),
      attended: Number(row.attended),
      hisErrors: Number(row.hisErrors),
    }));
  },

  async revenue(query: DbReportQuery, scope: string[] | null) {
    const { from, to } = bounds(query);
    const rows = await prisma.$queryRaw<RawRevenue[]>`
      WITH movements AS (
        SELECT p.facility_id, p.paid_at AS at, COALESCE(p.paid_amount, p.amount) AS online, 0::numeric AS refunded
        FROM payment p WHERE p.paid_at >= ${from} AND p.paid_at < ${to}
          AND p.status IN ('PAID', 'REFUND_PENDING', 'REFUNDED') ${scopeSql(scope, 'p.facility_id')}
        UNION ALL
        SELECT p.facility_id, p.refunded_at AS at, 0::numeric AS online, COALESCE(p.paid_amount, p.amount) AS refunded
        FROM payment p WHERE p.refunded_at >= ${from} AND p.refunded_at < ${to}
          AND p.status = 'REFUNDED' ${scopeSql(scope, 'p.facility_id')}
      )
      SELECT timezone('Asia/Ho_Chi_Minh', m.at)::date AS day,
        f.id AS "facilityId", f.name AS "facilityName",
        SUM(m.online) AS "onlineVnd", SUM(m.refunded) AS "refundedVnd"
      FROM movements m JOIN facility f ON f.id = m.facility_id
      GROUP BY 1, f.id, f.name ORDER BY 1 DESC, f.name LIMIT 10001`;
    return boundedRows(rows).map((row) => ({
      ...row,
      day: row.day.toISOString().slice(0, 10),
      onlineVnd: Number(row.onlineVnd),
      refundedVnd: Number(row.refundedVnd),
    }));
  },

  async facilities(scope: string[] | null) {
    return prisma.facility.findMany({
      where: scope === null ? {} : { id: { in: scope } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 500,
    });
  },
  health: reportHealth,
  dashboard: reportDashboard,
};
