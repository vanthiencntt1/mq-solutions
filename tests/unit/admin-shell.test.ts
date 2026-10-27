import { describe, expect, it, vi } from 'vitest';
import { ADMIN_NAV_GROUPS } from '@/lib/config/site';
import { activeAdminHref, groupedAdminNav, visibleAdminNav } from '@/components/admin/shell/admin-nav';
import { quickAdminDestination } from '@/components/admin/shell/admin-command';
import { getNavCounts, mapNavCounts } from '@/lib/services/report/nav-counts';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type { DashboardResult, ReportCache } from '@/lib/services/report/types';

const actor: AdminPrincipal = {
  id: 'manager-a', name: 'Quản lý', role: 'FACILITY_MANAGER', facilityIds: ['facility-a'],
  permissions: ['dashboard:read', 'appointment:read', 'payment:read', 'patient:read', 'review:read'],
};
const dashboard = {
  tasks: { staleHis: 2, cancelRequests: 3, refundPending: 4, paymentMismatch: 1,
    patientInfoMismatch: 0, reconcileMismatch: 0, outboxPending: 0 },
} as DashboardResult;

describe('App Shell quản trị', () => {
  it('nhóm đủ menu, chọn route con sâu nhất và giữ lọc quyền', () => {
    const all = visibleAdminNav({ name: 'SUPER_ADMIN', permissions: [] });
    expect(groupedAdminNav(all).map((group) => group.name)).toEqual(ADMIN_NAV_GROUPS);
    expect(groupedAdminNav(all).flatMap((group) => group.items)).toEqual(all);
    const limited = visibleAdminNav({ name: actor.role, permissions: actor.permissions });
    expect(limited.map((item) => item.href)).toEqual([
      '/admin', '/admin/lich-dat', '/admin/thanh-toan', '/admin/benh-nhan', '/admin/danh-gia', '/admin/danh-gia/gop-y',
    ]);
    expect(activeAdminHref('/admin/danh-gia/gop-y/chi-tiet', limited)).toBe('/admin/danh-gia/gop-y');
    expect(activeAdminHref('/admin/lich-dat/MQABCDEF12', limited)).toBe('/admin/lich-dat');
  });

  it('nhận dạng mã phiếu, CCCD và SĐT theo quyền', () => {
    const role = { name: actor.role, permissions: actor.permissions };
    expect(quickAdminDestination(' mqabcdef12 ', role)?.href).toBe('/admin/lich-dat/MQABCDEF12');
    expect(quickAdminDestination('012345678901', role)?.href).toBe('/admin/benh-nhan?q=012345678901');
    expect(quickAdminDestination('0912345678', role)?.href).toBe('/admin/benh-nhan?q=0912345678');
    expect(quickAdminDestination('091234567', role)).toBeNull();
    expect(quickAdminDestination('MQABCDEF12', { name: 'STAFF', permissions: [] })).toBeNull();
    expect(quickAdminDestination('0912345678', { name: 'STAFF', permissions: [] })).toBeNull();
  });

  it('đếm việc từ dashboard, cache 60 giây theo actor và phạm vi', async () => {
    expect(mapNavCounts(dashboard.tasks, 5)).toEqual({
      '/admin/lich-dat': 5, '/admin/thanh-toan': 5, '/admin/danh-gia': 5,
    });
    const data = new Map<string, unknown>();
    const setMock = vi.fn(async (key: string, value: unknown) => { data.set(key, value); });
    const cache: Pick<ReportCache, 'get' | 'set'> = {
      get: async <T>(key: string): Promise<T | null> => (data.get(key) as T | undefined) ?? null,
      set: setMock,
    };
    const deps = {
      dashboard: vi.fn(async () => dashboard),
      pendingReviews: vi.fn(async (_scope: string[] | null) => 5),
      cache,
    };
    await getNavCounts(actor, deps);
    await getNavCounts(actor, deps);
    expect(deps.dashboard).toHaveBeenCalledTimes(1);
    expect(await getNavCounts({ ...actor, permissions: ['dashboard:read'] }, deps)).toEqual({
      '/admin/lich-dat': 0, '/admin/thanh-toan': 0, '/admin/danh-gia': 0,
    });
    expect(deps.pendingReviews).toHaveBeenCalledWith(['facility-a']);
    expect(setMock).toHaveBeenCalledWith('admin:nav-counts:manager-a:facility-a', expect.any(Object), 60);
    await getNavCounts({ ...actor, facilityIds: ['facility-b'] }, deps);
    await getNavCounts({ ...actor, facilityIds: null }, deps);
    expect(deps.pendingReviews).toHaveBeenNthCalledWith(2, ['facility-b']);
    expect(deps.pendingReviews).toHaveBeenNthCalledWith(3, null);
    const noReview = { ...actor, id: 'no-review', permissions: ['dashboard:read'] };
    expect(await getNavCounts(noReview, deps)).toEqual({
      '/admin/lich-dat': 0, '/admin/thanh-toan': 0, '/admin/danh-gia': 0,
    });
    expect(deps.pendingReviews).toHaveBeenCalledTimes(3);
  });
});
