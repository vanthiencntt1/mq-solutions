import { describe, expect, it, vi } from 'vitest';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { reportCsv } from '@/lib/services/report/csv';
import { ReportService } from '@/lib/services/report/report-service';
import { ReportQuerySchema, type ReportCache, type ReportRepository } from '@/lib/services/report/types';

const facilityId = '40575916-9f38-4ac8-8c69-42cd54901f94';
const otherId = 'e4451f1c-101d-4a78-9c6c-4b106424c676';
const actor: AdminPrincipal = {
  id: 'admin',
  role: 'FACILITY_MANAGER',
  facilityIds: [facilityId],
  name: 'Quản lý',
  permissions: ['report:read', 'dashboard:read', 'monitor:read'],
};
const query = ReportQuerySchema.parse({ from: '2026-10-01', to: '2026-10-27' });
const booking = {
  period: '2026-10-01',
  facilityId,
  facilityName: 'Bệnh viện A',
  specialtyName: 'Nội tổng quát',
  objectType: 'BHYT',
  payMethod: 'ONLINE',
  bookings: 10,
  cancelled: 2,
  attended: 6,
  hisErrors: 1,
};

function setup() {
  const repo: ReportRepository = {
    bookings: vi.fn(async () => [booking]),
    revenue: vi.fn(async () => [
      { day: '2026-10-01', facilityId, facilityName: 'Bệnh viện A', onlineVnd: 1000000, refundedVnd: 200000 },
    ]),
    facilities: vi.fn(async () => [{ id: facilityId, name: 'Bệnh viện A' }]),
    health: vi.fn(async () => [
      {
        id: facilityId,
        code: 'BVA',
        name: 'Bệnh viện A',
        health: 'OK',
        lastOkAt: null,
        latencyMs: 120,
        checks: 10,
        errors: 1,
        errorRate: 0.1,
        outboxPending: 2,
      },
    ]),
    dashboard: vi.fn(async () => ({
      newBookings: 10,
      examsToday: 8,
      onlineBookings: 7,
      atFacilityBookings: 3,
      onlineVnd: 1000000,
      hisErrors: 1,
      hisErrorRate: 0.1,
      tasks: {
        staleHis: 1,
        cancelRequests: 0,
        refundPending: 0,
        paymentMismatch: 0,
        patientInfoMismatch: 0,
        reconcileMismatch: 0,
        outboxPending: 2,
      },
    })),
  };
  const data = new Map<string, unknown>();
  const cache: ReportCache = {
    get: async <T>(key: string) => (data.get(key) as T | undefined) ?? null,
    set: vi.fn(async (key: string, value: unknown) => {
      data.set(key, value);
    }),
  };
  return {
    service: new ReportService({ repo, cache, now: () => new Date('2026-10-27T05:00:00Z') }),
    repo,
    cache,
  };
}

describe('A10 – báo cáo và giám sát', () => {
  it('tổng hợp tỷ lệ, tiền và cache theo phạm vi cơ sở', async () => {
    const { service, repo, cache } = setup();
    const result = await service.report(actor, query);
    expect(result.totals).toMatchObject({
      bookings: 10,
      cancellationRate: 0.2,
      attendanceRate: 0.6,
      hisErrorRate: 0.1,
      onlineVnd: 1000000,
      refundedVnd: 200000,
    });
    expect(repo.bookings).toHaveBeenCalledWith(query, [facilityId]);
    expect(cache.set).toHaveBeenCalledWith(expect.stringContaining(facilityId), result, 60);
    await service.report(actor, query);
    expect(repo.bookings).toHaveBeenCalledTimes(1);
  });

  it('từ chối bộ lọc cơ sở ngoài phạm vi và quyền thiếu', async () => {
    const { service, repo } = setup();
    await expect(service.report(actor, { ...query, facilityId: otherId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(service.report({ ...actor, permissions: [] }, query)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(repo.bookings).not.toHaveBeenCalled();
  });

  it('giới hạn ngày và không chấp nhận ngày sai', () => {
    expect(ReportQuerySchema.safeParse({ from: '2025-01-01', to: '2026-10-27' }).success).toBe(false);
    expect(ReportQuerySchema.safeParse({ from: '2026-11-01', to: '2026-10-27' }).success).toBe(false);
    expect(ReportQuerySchema.safeParse({ from: '2026-02-30', to: '2026-10-27' }).success).toBe(false);
  });

  it('dashboard giữ phạm vi và số tồn đọng', async () => {
    const { service, repo } = setup();
    const result = await service.dashboard(actor);
    expect(result.tasks.outboxPending).toBe(2);
    expect(result.health[0]?.latencyMs).toBe(120);
    expect(repo.dashboard).toHaveBeenCalledWith(
      [facilityId],
      expect.any(Date),
      expect.any(Date),
      expect.any(Date),
    );
  });

  it('CSV vô hiệu công thức từ tên cơ sở và giữ BOM cho Excel', () => {
    const csv = reportCsv([{ ...booking, facilityName: '=HYPERLINK("x")' }], []);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("'=HYPERLINK");
    expect(csv).toContain('""x""');
  });
});
