import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS, scopeFacilities } from '@/lib/domain/admin/permissions';
import type { AdminAuthDeps, AdminRecord, AdminSessionRecord } from '@/lib/domain/admin/ports';
import { AdminAuthService } from '@/lib/services/admin-auth/admin-auth-service';

function setup() {
  const now = new Date('2026-10-27T08:00:00Z');
  const user: AdminRecord = {
    id: 'u1',
    email: 'admin@example.com',
    name: 'Quản trị',
    passwordHash: 'good-password',
    totpSecretEnc: 'secret',
    role: { name: 'SUPER_ADMIN', permissions: ['*'] },
    facilityId: null,
    active: true,
    failedCount: 0,
    lockedUntil: null,
  };
  let session: AdminSessionRecord | null = null;
  let idle = false;
  const audits: string[] = [];
  const d: AdminAuthDeps = {
    repo: {
      findByEmail: async (email) => (email === user.email ? user : null),
      findById: async () => user,
      updateLogin: async (_id, data) => {
        user.failedCount = data.failedCount;
        user.lockedUntil = data.lockedUntil;
      },
      recordFailure: async (_id, date) => {
        user.failedCount++;
        if (user.failedCount < 5) return false;
        user.failedCount = 0;
        user.lockedUntil = new Date(date.getTime() + 15 * 60_000);
        return true;
      },
      updatePassword: async (_id, hash) => {
        user.passwordHash = hash;
      },
      updateTotp: async (_id, value) => {
        user.totpSecretEnc = value;
      },
      createSession: async (data) => {
        session = { userId: data.userId, expiresAt: data.expiresAt, revokedAt: null, user };
      },
      findSession: async () => session,
      revokeSession: async (_hash, date) => {
        if (session) session.revokedAt = date;
      },
      revokeUserSessions: async (_id, date) => {
        if (session) session.revokedAt = date;
      },
      audit: async (entry) => {
        audits.push(entry.action);
      },
    },
    hasher: { hash: async (plain) => plain, verify: async (hash, plain) => hash === plain },
    totp: { generate: () => 'secret', verify: (code) => code === '123456', uri: () => 'otpauth://example' },
    cipher: { encrypt: (value) => value, decrypt: (value) => value },
    session: {
      createToken: () => 'a'.repeat(43),
      hashToken: (token) => token,
      getIdle: async () => idle,
      touchIdle: async () => {
        idle = true;
      },
      clearIdle: async () => {
        idle = false;
      },
    },
    limiter: { hit: async () => ({ allowed: true }) },
    now: () => now,
  };
  return {
    service: new AdminAuthService(d),
    user,
    audits,
    expireIdle: () => {
      idle = false;
    },
  };
}

const credentials = { email: 'admin@example.com', password: 'good-password', totp: '123456' };

describe('A01 đăng nhập quản trị', () => {
  it('chỉ tạo phiên sau khi mật khẩu và TOTP đúng; phiên hết khi nhàn rỗi', async () => {
    const { service, audits, expireIdle } = setup();
    const result = await service.login(credentials, 'ip-hash');
    expect(result.kind).toBe('authenticated');
    if (result.kind !== 'authenticated') return;
    expect(await service.resolve(result.token, PERMISSIONS.CONFIG_UPDATE)).toMatchObject({
      id: 'u1',
      facilityIds: null,
    });
    expireIdle();
    expect(await service.resolve(result.token)).toBeNull();
    expect(audits).toContain('LOGIN');
  });

  it('khóa 15 phút sau 5 lần sai mật khẩu', async () => {
    const { service, user, audits } = setup();
    for (let i = 0; i < 4; i++)
      await expect(service.login({ ...credentials, password: 'wrong' }, 'ip')).rejects.toMatchObject({
        code: 'ADMIN_INVALID_CREDENTIALS',
      });
    await expect(service.login({ ...credentials, password: 'wrong' }, 'ip')).rejects.toMatchObject({
      code: 'ADMIN_ACCOUNT_LOCKED',
    });
    expect(user.lockedUntil?.toISOString()).toBe('2026-10-27T08:15:00.000Z');
    await expect(service.login(credentials, 'ip')).rejects.toMatchObject({ code: 'ADMIN_ACCOUNT_LOCKED' });
    expect(audits.at(-1)).toBe('LOGIN_LOCKED');
  });

  it('TOTP sai cũng tăng số lần thất bại', async () => {
    const { service, user } = setup();
    await expect(service.login({ ...credentials, totp: '000000' }, 'ip')).rejects.toMatchObject({
      code: 'ADMIN_INVALID_CREDENTIALS',
    });
    expect(user.failedCount).toBe(1);
  });

  it('tài khoản mới chỉ nhận URI thiết lập sau khi mật khẩu đúng', async () => {
    const { service, user } = setup();
    user.totpSecretEnc = 'pending:secret';
    await expect(
      service.login({ ...credentials, password: 'wrong', totp: undefined }, 'ip'),
    ).rejects.toBeInstanceOf(AppError);
    expect(await service.login({ ...credentials, totp: undefined }, 'ip')).toEqual({
      kind: 'setup',
      uri: 'otpauth://example',
    });
    expect(user.totpSecretEnc).toBe('pending:secret');
    await service.login(credentials, 'ip');
    expect(user.totpSecretEnc).toBe('secret');
  });
});

describe('A01 RBAC và cơ sở', () => {
  it('áp dụng quyền theo vai trò và module', () => {
    expect(can({ name: 'SUPER_ADMIN', permissions: ['*'] }, PERMISSIONS.CONFIG_UPDATE)).toBe(true);
    expect(can({ name: 'EDITOR', permissions: ['content:*'] }, PERMISSIONS.CONTENT_WRITE)).toBe(true);
    expect(can({ name: 'EDITOR', permissions: ['content:*'] }, PERMISSIONS.APPOINTMENT_READ)).toBe(false);
  });
  it('không mở rộng phạm vi nhân viên khi thiếu facilityId', () => {
    expect(scopeFacilities({ role: 'FACILITY_STAFF', facilityId: 'facility-a' })).toEqual(['facility-a']);
    expect(scopeFacilities({ role: 'FACILITY_STAFF', facilityId: null })).toEqual([]);
    expect(scopeFacilities({ role: 'SUPER_ADMIN', facilityId: null })).toBeNull();
  });
  it('từ chối đọc phiên khi quyền hoặc cơ sở không hợp lệ', async () => {
    const { service, user } = setup();
    const result = await service.login(credentials, 'ip');
    if (result.kind !== 'authenticated') return;
    user.role = { name: 'FACILITY_STAFF', permissions: ['appointment:read'] };
    user.facilityId = 'facility-a';
    await expect(service.resolve(result.token, PERMISSIONS.CONFIG_UPDATE)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(await service.resolve(result.token, PERMISSIONS.APPOINTMENT_READ)).toMatchObject({
      facilityIds: ['facility-a'],
    });
    user.facilityId = null;
    await expect(service.resolve(result.token)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});
