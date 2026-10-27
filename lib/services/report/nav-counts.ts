import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { NavCounts } from '@/lib/domain/admin/nav-counts';
import type { DashboardResult, ReportCache } from './types';

export function mapNavCounts(tasks: DashboardResult['tasks'], pendingReviews: number): NavCounts {
  return {
    '/admin/lich-dat': tasks.staleHis + tasks.cancelRequests,
    '/admin/thanh-toan': tasks.refundPending + tasks.paymentMismatch,
    '/admin/danh-gia': pendingReviews,
  };
}

export async function getNavCounts(
  actor: AdminPrincipal,
  deps: {
    dashboard: (actor: AdminPrincipal) => Promise<DashboardResult>;
    pendingReviews: (scope: string[] | null) => Promise<number>;
    cache: Pick<ReportCache, 'get' | 'set'>;
  },
): Promise<NavCounts> {
  // Cả người dùng và phạm vi đều thuộc khóa: không dùng chung badge giữa các phiên/phạm vi.
  const scope = actor.facilityIds === null ? 'all' : [...actor.facilityIds].sort().join(',');
  const key = `admin:nav-counts:${actor.id}:${scope}`;
  const role = { name: actor.role, permissions: actor.permissions };
  const allowed = (counts: NavCounts): NavCounts => ({
    '/admin/lich-dat': can(role, PERMISSIONS.APPOINTMENT_READ) ? counts['/admin/lich-dat'] : 0,
    '/admin/thanh-toan': can(role, PERMISSIONS.PAYMENT_READ) ? counts['/admin/thanh-toan'] : 0,
    '/admin/danh-gia': can(role, PERMISSIONS.REVIEW_READ) ? counts['/admin/danh-gia'] : 0,
  });
  const cached = await deps.cache.get<NavCounts>(key);
  if (cached) return allowed(cached);
  const [dashboard, pendingReviews] = await Promise.all([
    deps.dashboard(actor),
    can(role, PERMISSIONS.REVIEW_READ) ? deps.pendingReviews(actor.facilityIds) : Promise.resolve(0),
  ]);
  const counts = mapNavCounts(dashboard.tasks, pendingReviews);
  await deps.cache.set(key, counts, 60);
  return allowed(counts);
}
