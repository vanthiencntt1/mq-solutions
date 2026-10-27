import { describe, expect, it, vi } from 'vitest';
import { AdminFacilityService } from '@/lib/services/admin-facility/admin-facility-service';
import {
  FacilityCreateSchema,
  FacilityListSchema,
  FacilityUrlSchema,
} from '@/lib/domain/admin/facility-schemas';
import type { FacilityDeps, FacilityRow } from '@/lib/domain/admin/facility-ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';

const input = FacilityCreateSchema.parse({
  code: 'BVA',
  slug: 'benh-vien-a',
  name: 'Bệnh viện A',
  type: 'BV_CONG',
  provinceName: 'Hà Nội',
  address: 'Số 1',
  lat: null,
  lng: null,
  hotline: null,
  workingHours: {},
  logoUrl: null,
  images: [],
  shortDesc: null,
  introJson: null,
  apiBaseUrl: 'https://his.example.test',
  partnerCode: 'MQ_WEB',
  secretRef: 'HIS_KEY_BVA',
  timeoutMs: 5000,
  payProvider: 'SEPAY',
  bankCode: 'VCB',
  bankAccountNo: '0123456789',
  bankAccountName: 'BENH VIEN A',
  webhookKeyRef: 'SEPAY_WEBHOOK_KEY_BVA',
  bookingMode: 'SPECIALTY',
  allowBhyt: true,
  allowSameDay: false,
  payOptions: ['ONLINE', 'AT_FACILITY'],
  cancelCutoff: 'D-1 15:00',
  reconcileTime: '21:00',
  featured: false,
  sortOrder: 0,
});

const admin: AdminPrincipal = {
  id: 'admin-1',
  role: 'SUPER_ADMIN',
  facilityIds: null,
  name: 'Admin',
  permissions: ['facility:read', 'facility:update'],
};

function setup() {
  let row: FacilityRow = {
    ...input,
    id: 'facility-1',
    status: 'INACTIVE',
    health: 'UNKNOWN',
    lastOkAt: null,
    updatedAt: new Date('2026-10-27T00:00:00Z'),
    appointmentsToday: 0,
  };
  const audit = vi.fn();
  const invalidated = vi.fn();
  const call = vi.fn(async (..._args: unknown[]): Promise<unknown> => [{ id: 1, name: 'Nội tổng quát' }]);
  const recordHealth = vi.fn(async (_id: string, health: string, at: Date | null) => {
    row = { ...row, health, lastOkAt: at ?? row.lastOkAt };
  });
  const deps: FacilityDeps = {
    repo: {
      list: async () => ({ rows: [row], total: 1 }),
      find: async () => row,
      exists: async () => false,
      create: async () => row,
      update: async (_id, changes, _actorId, diff) => {
        audit(diff);
        row = { ...row, ...changes };
        return row;
      },
      passwordHash: async () => 'hash',
      recordHealth,
      activeIds: async () => [row.id],
    },
    his: { call: call as unknown as FacilityDeps['his']['call'] },
    verifyPassword: async (_hash, plain) => plain === 'correct',
    envHas: (ref) => ref === 'HIS_KEY_BVA',
    invalidateConnection: invalidated,
    clearCache: async () => 2,
    storage: { save: async () => ({ key: 'test', url: '/uploads/test.webp', size: 3, mime: 'image/webp' }) },
    now: () => new Date('2026-10-27T01:00:00Z'),
    elapsed: () => 100,
  };
  return {
    svc: new AdminFacilityService(deps),
    audit,
    invalidated,
    call,
    recordHealth,
    get row() {
      return row;
    },
  };
}

describe('A02 quản lý cơ sở', () => {
  it('chỉ nhận HTTPS hoặc HTTP nội bộ, kiểm tra chính sách đặt khám', () => {
    expect(FacilityUrlSchema.safeParse('http://10.10.1.20:8080').success).toBe(true);
    expect(FacilityUrlSchema.safeParse('http://public.example.com').success).toBe(false);
    expect(FacilityCreateSchema.safeParse({ ...input, payOptions: [] }).success).toBe(false);
    expect(FacilityListSchema.parse({ status: '' }).status).toBeUndefined();
  });

  it('giới hạn nhân viên theo cơ sở và không cho tạo cơ sở mới', async () => {
    const { svc } = setup();
    const scoped = { ...admin, role: 'FACILITY_STAFF', facilityIds: ['other'] };
    await expect(svc.get(scoped, 'facility-1')).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(svc.create(scoped, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const result = await svc.list(admin, FacilityListSchema.parse({}));
    expect(result.rows[0]?.secretAvailable).toBe(true);
    expect(result.rows[0]?.webhookKeyAvailable).toBe(false);
  });

  it('đòi mật khẩu khi đổi URL hoặc số tài khoản, ghi diff đã che và xóa cache kết nối', async () => {
    const { svc, audit, invalidated } = setup();
    await expect(
      svc.update(admin, 'facility-1', { apiBaseUrl: 'https://new.example.test' }),
    ).rejects.toMatchObject({ code: 'ADMIN_WRONG_PASSWORD' });
    await svc.update(admin, 'facility-1', {
      apiBaseUrl: 'https://new.example.test',
      confirmPassword: 'correct',
    });
    expect(invalidated).toHaveBeenCalledWith('facility-1');
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ health: { from: 'UNKNOWN', to: 'UNKNOWN' } }),
    );
    await svc.update(admin, 'facility-1', { bankAccountNo: '9876543210', confirmPassword: 'correct' });
    expect(audit).toHaveBeenLastCalledWith({ bankAccountNo: { from: '***', to: '***' } });
  });

  it('đo kiểm tra HIS, giữ lastOkAt khi lỗi và chỉ bật khi kết nối OK', async () => {
    const { svc, call, recordHealth } = setup();
    await expect(svc.changeStatus(admin, 'facility-1', 'ACTIVE')).rejects.toMatchObject({
      code: 'FACILITY_HEALTH_REQUIRED',
    });
    const success = await svc.checkConnection(admin, 'facility-1');
    expect(success.health).toBe('OK');
    expect(recordHealth).toHaveBeenCalledWith('facility-1', 'OK', expect.any(Date), 0, undefined);
    await svc.changeStatus(admin, 'facility-1', 'ACTIVE');
    call.mockRejectedValueOnce(new Error('timeout'));
    const down = await svc.checkConnection(admin, 'facility-1');
    expect(down.health).toBe('DOWN');
    expect(down.lastOkAt).toEqual(success.lastOkAt);
  });

  it('kiểm tra thêm bác sĩ khi chọn theo bác sĩ và từ chối payload sai dạng', async () => {
    const { svc, call } = setup();
    await svc.update(admin, 'facility-1', { bookingMode: 'DOCTOR' });
    call.mockResolvedValueOnce([{ id: 1, name: 'Nội' }]).mockResolvedValueOnce({ bad: true });
    const result = await svc.checkConnection(admin, 'facility-1');
    expect(result.health).toBe('DEGRADED');
    expect(call).toHaveBeenCalledWith('facility-1', 'Doctors/GetDoctors', {});
  });
});
