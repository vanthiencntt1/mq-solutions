import { describe, expect, it } from 'vitest';
import type { AccountRecord } from '@/lib/domain/account/ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { AdminPatientsService } from '@/lib/services/admin-patients/admin-patients-service';
import { PatientSearchSchema } from '@/lib/services/admin-patients/schemas';
import type { AdminPatientsDeps, PatientRepository, SearchFilter } from '@/lib/services/admin-patients/types';

const accountId = '00000000-0000-4000-8000-000000000001';
const central: AdminPrincipal = {
  id: 'admin',
  name: 'Quản trị',
  role: 'OPERATOR',
  facilityIds: null,
  permissions: ['patient:read', 'patient:reset-password', 'audit:read'],
};
const staff: AdminPrincipal = {
  id: 'staff',
  name: 'Nhân viên',
  role: 'FACILITY_STAFF',
  facilityIds: ['facility-a'],
  permissions: ['patient:read', 'patient:reset-password'],
};

function fixture(): AccountRecord {
  return {
    id: accountId,
    cccdEnc: '001090123456',
    cccdHmac: 'h:001090123456',
    fullName: 'Nguyễn Văn An',
    fullNameNorm: 'NGUYEN VAN AN',
    birthYear: 1990,
    birthDate: null,
    gender: 1,
    phone: '0912345678',
    phoneHmac: 'h:0912345678',
    email: 'patient@gmail.com',
    addressLine: null,
    insuranceNoEnc: null,
    passwordHash: 'old-hash',
    mustChangePassword: false,
    passwordChangedAt: null,
    tokenVersion: 0,
    failedCount: 0,
    lockedUntil: null,
    status: 'ACTIVE',
    consentVersion: 'v1',
    consentAt: new Date('2026-01-01'),
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
  };
}

function setup() {
  let account = fixture();
  let pendingDeletion: Date | null = null;
  let sendFails = false;
  const searches: SearchFilter[] = [];
  const events: string[] = [];
  const mails: string[] = [];
  const cacheDeletes: string[] = [];
  const repo: PatientRepository = {
    async search(filter) {
      searches.push(filter);
      return { rows: [account], total: 1 };
    },
    async findScoped(id, ids) {
      return id === account.id && (ids === null || ids.includes('facility-a')) ? account : null;
    },
    async cccdExists() {
      return false;
    },
    async mutate(_id, patch, event) {
      account = { ...account, ...patch, tokenVersion: account.tokenVersion + 1 };
      events.push(event.action);
    },
    async auditView(_id, _actorId, action) {
      events.push(action);
    },
    async appointments() {
      return { rows: [], total: 0 };
    },
    async events() {
      return [];
    },
    async pendingDeletion() {
      return pendingDeletion;
    },
    async anonymize(_id, patch) {
      account = { ...account, ...patch, tokenVersion: account.tokenVersion + 1 };
      events.push('DELETE_PROCESSED');
    },
  };
  const deps: AdminPatientsDeps = {
    repo,
    pii: { encrypt: (value) => value, decrypt: (value) => value, hmac: (value) => `h:${value}` },
    hasher: { hash: async (value) => `hash:${value}` },
    limiter: { hit: async () => ({ allowed: true, count: 1 }) },
    tvCache: {
      get: async () => null,
      set: async () => {},
      del: async (id) => {
        cacheDeletes.push(`tv:${id}`);
      },
    },
    mailer: {
      send: async ({ to }) => {
        if (sendFails) throw new Error('smtp');
        mails.push(to);
      },
    },
    storage: {
      save: async () => ({ key: '2026/10/evidence.jpg', url: '', size: 3, mime: 'image/jpeg' }),
      remove: async () => {},
    },
    clearIdentity: async (id) => {
      cacheDeletes.push(`ident:${id}`);
    },
    randomInt: () => 0,
    randomId: () => 'random-anonymous-id',
    now: () => new Date('2026-10-27'),
    appUrl: 'https://mq.example',
  };
  return {
    service: new AdminPatientsService(deps),
    searches,
    events,
    mails,
    cacheDeletes,
    account: () => account,
    setPending: () => {
      pendingDeletion = new Date('2026-10-26');
    },
    failMail: () => {
      sendFails = true;
    },
  };
}

describe('A05 – quản lý tài khoản bệnh nhân', () => {
  it('từ chối CCCD 11 số và không cho tra cứu rỗng', () => {
    expect(PatientSearchSchema.safeParse({ kind: 'cccd', q: '00109012345' }).success).toBe(false);
    expect(PatientSearchSchema.safeParse({ kind: 'name', q: '' }).success).toBe(false);
  });

  it('tra CCCD qua HMAC và che dữ liệu trên danh sách', async () => {
    const s = setup();
    const result = await s.service.search(central, { kind: 'cccd', q: '001090123456', page: 1 });
    expect(s.searches[0]).toMatchObject({ kind: 'cccd', value: 'h:001090123456' });
    expect(result.rows[0]).toMatchObject({
      cccdMasked: '********3456',
      phoneMasked: '091****678',
      emailMasked: 'p***@gmail.com',
    });
    expect(JSON.stringify(result.rows)).not.toContain('001090123456');
  });

  it('nhân viên cơ sở không tìm bằng tên hoặc mở CCCD', async () => {
    const s = setup();
    await expect(s.service.search(staff, { kind: 'name', q: 'Nguyễn', page: 1 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(s.service.revealCccd(staff, accountId)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(s.events).toEqual([]);
  });

  it('mở CCCD đầy đủ chỉ sau khi ghi VIEW_PII', async () => {
    const s = setup();
    await expect(s.service.revealCccd(central, accountId)).resolves.toEqual({ cccd: '001090123456' });
    expect(s.events).toEqual(['VIEW_PII']);
  });

  it('khóa và đăng xuất tăng token version', async () => {
    const s = setup();
    await s.service.action(central, accountId, { action: 'LOCK', reason: 'Xác minh tài khoản' });
    await s.service.action(central, accountId, { action: 'LOGOUT_ALL', reason: 'Bảo vệ tài khoản' });
    expect(s.account()).toMatchObject({ status: 'LOCKED', tokenVersion: 2 });
    expect(s.cacheDeletes).toHaveLength(2);
  });

  it('cấp lại mật khẩu gửi email và yêu cầu đổi sau đăng nhập', async () => {
    const s = setup();
    await s.service.action(staff, accountId, { action: 'RESET_PASSWORD', reason: 'Đã xem CCCD gốc' });
    expect(s.account().passwordHash).not.toBe('old-hash');
    expect(s.account()).toMatchObject({ mustChangePassword: true, tokenVersion: 1 });
    expect(s.mails).toEqual(['patient@gmail.com']);
  });

  it('email lỗi thì khôi phục mật khẩu trước đó', async () => {
    const s = setup();
    s.failMail();
    await expect(
      s.service.action(central, accountId, { action: 'RESET_PASSWORD', reason: 'Đã xác minh tại quầy' }),
    ).rejects.toMatchObject({ code: 'MAIL_SEND_FAILED' });
    expect(s.account().passwordHash).toBe('old-hash');
    expect(s.events).toContain('PATIENT_RESET_ROLLBACK');
  });

  it('chỉ ẩn danh khi có yêu cầu xóa; giữ khóa tài khoản để phiếu liên kết', async () => {
    const s = setup();
    await expect(
      s.service.action(central, accountId, { action: 'DELETE', reason: 'Xử lý yêu cầu xóa' }),
    ).rejects.toMatchObject({ code: 'A05_NO_DELETE_REQUEST' });
    s.setPending();
    await s.service.action(central, accountId, { action: 'DELETE', reason: 'Xử lý yêu cầu xóa' });
    expect(s.account()).toMatchObject({
      id: accountId,
      status: 'DELETED',
      fullName: 'Tài khoản đã xóa',
      phone: '',
    });
    expect(s.account().cccdHmac).not.toBe('h:001090123456');
    expect(s.cacheDeletes).toContain(`ident:${accountId}`);
  });

  it('sửa định danh cần ảnh giấy tờ và xóa cache HIS', async () => {
    const s = setup();
    await s.service.update(central, accountId, {
      fullName: 'Nguyễn Văn Bình',
      reason: 'Đã xác minh tại quầy',
      evidence: { mime: 'image/jpeg', base64: Buffer.from([0xff, 0xd8, 0xff]).toString('base64') },
    });
    expect(s.account().fullNameNorm).toBe('NGUYEN VAN BINH');
    expect(s.events).toContain('PATIENT_UPDATE');
    expect(s.cacheDeletes).toContain(`ident:${accountId}`);
  });
});
