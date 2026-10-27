import { AppError } from '@/lib/domain/errors';
import { formatInTimeZone } from 'date-fns-tz';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type { DashboardResult, ReportCache, ReportQuery, ReportRepository, ReportResult } from './types';

export interface ReportDeps {
  repo: ReportRepository;
  cache: ReportCache;
  now(): Date;
}

export class ReportService {
  constructor(private readonly d: ReportDeps) {}

  async report(actor: AdminPrincipal, query: ReportQuery): Promise<ReportResult> {
    this.authorize(actor, PERMISSIONS.REPORT_READ, query.facilityId);
    const key = this.key('report', actor.facilityIds, query);
    const cached = await this.d.cache.get<ReportResult>(key);
    if (cached) return cached;
    const scope = query.facilityId ? [query.facilityId] : actor.facilityIds;
    const [bookings, revenue, facilities] = await Promise.all([
      this.d.repo.bookings(query, scope),
      this.d.repo.revenue(query, scope),
      this.d.repo.facilities(scope),
    ]);
    const totals = bookings.reduce(
      (sum, row) => ({
        bookings: sum.bookings + row.bookings,
        cancelled: sum.cancelled + row.cancelled,
        attended: sum.attended + row.attended,
        hisErrors: sum.hisErrors + row.hisErrors,
      }),
      { bookings: 0, cancelled: 0, attended: 0, hisErrors: 0 },
    );
    const result = {
      query,
      facilities,
      bookings,
      revenue,
      totals: {
        ...totals,
        cancellationRate: totals.bookings ? totals.cancelled / totals.bookings : 0,
        attendanceRate: totals.bookings ? totals.attended / totals.bookings : 0,
        hisErrorRate: totals.bookings ? totals.hisErrors / totals.bookings : 0,
        onlineVnd: revenue.reduce((sum, row) => sum + row.onlineVnd, 0),
        refundedVnd: revenue.reduce((sum, row) => sum + row.refundedVnd, 0),
      },
    };
    await this.d.cache.set(key, result, 60);
    return result;
  }

  async dashboard(actor: AdminPrincipal): Promise<DashboardResult> {
    this.authorize(actor, PERMISSIONS.DASHBOARD_READ);
    const now = this.d.now();
    const day = formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    const start = new Date(`${day}T00:00:00+07:00`);
    const end = new Date(start.getTime() + 86_400_000);
    const key = this.key('dashboard', actor.facilityIds, { day });
    const cached = await this.d.cache.get<DashboardResult>(key);
    if (cached) return cached;
    const [stats, health] = await Promise.all([
      this.d.repo.dashboard(actor.facilityIds, start, end, now),
      this.d.repo.health(actor.facilityIds, new Date(now.getTime() - 3_600_000)),
    ]);
    const result = { ...stats, health };
    await this.d.cache.set(key, result, 45);
    return result;
  }

  async health(actor: AdminPrincipal) {
    this.authorize(actor, PERMISSIONS.MONITOR_READ);
    return this.d.repo.health(actor.facilityIds, new Date(this.d.now().getTime() - 3_600_000));
  }

  async facilityOptions(actor: AdminPrincipal) {
    this.authorize(actor, PERMISSIONS.REPORT_READ);
    return this.d.repo.facilities(actor.facilityIds);
  }

  private authorize(
    actor: AdminPrincipal,
    permission:
      typeof PERMISSIONS.REPORT_READ | typeof PERMISSIONS.DASHBOARD_READ | typeof PERMISSIONS.MONITOR_READ,
    facilityId?: string,
  ) {
    if (!can({ name: actor.role, permissions: actor.permissions }, permission))
      throw new AppError('FORBIDDEN');
    if (actor.facilityIds?.length === 0) throw new AppError('FORBIDDEN');
    if (facilityId && actor.facilityIds && !actor.facilityIds.includes(facilityId))
      throw new AppError('FORBIDDEN');
  }

  private key(kind: string, scope: string[] | null, query: object) {
    return `a10:${kind}:${scope === null ? 'all' : [...scope].sort().join(',')}:${JSON.stringify(query)}`;
  }
}
