import { describe, expect, it } from 'vitest';
import {
  PrivacyService,
  type PrivacyAccount,
  type PrivacyDeps,
} from '@/lib/services/privacy/privacy-service';

const account: PrivacyAccount = {
  id: 'patient-1',
  status: 'ACTIVE',
  passwordHash: 'hashed-secret',
  cccdEnc: 'enc:079090000001',
  phone: '0900000001',
  email: 'mau@example.com',
  birthYear: 1990,
  gender: 1,
  consentVersion: '2026-10',
  consentAt: new Date('2026-10-01T00:00:00Z'),
  createdAt: new Date('2026-10-01T00:00:00Z'),
};

function makeService() {
  let requestAt: Date | null = null;
  let writes = 0;
  let exports = 0;
  let attempts = 0;
  const deps: PrivacyDeps = {
    repository: {
      findAccount: async () => account,
      findDeletionRequest: async () => requestAt,
      createDeletionRequest: async () => {
        writes++;
        requestAt = new Date('2026-10-27T01:00:00Z');
        return requestAt;
      },
      listAppointments: async () => [
        {
          code: 'MQ001',
          facility: 'Bệnh viện mẫu',
          examDate: new Date('2026-11-01T00:00:00Z'),
          status: 'DA_CO_STT',
          amount: 220000,
          createdAt: new Date('2026-10-27T00:00:00Z'),
        },
      ],
      recordExport: async () => {
        exports++;
      },
    },
    hasher: { verify: async (hash, plain) => hash === `hashed-${plain}` },
    pii: { decrypt: (payload) => payload.slice(4) },
    limiter: {
      hit: async () => {
        attempts++;
        return { allowed: attempts <= 5, count: attempts };
      },
    },
    now: () => new Date('2026-10-27T02:00:00Z'),
  };
  return { service: new PrivacyService(deps), stats: () => ({ writes, exports }) };
}

describe('C10 quyền riêng tư', () => {
  it('xác minh mật khẩu và ghi yêu cầu xóa đúng một lần', async () => {
    const { service, stats } = makeService();
    await expect(service.requestDeletion(account.id, 'wrong')).rejects.toMatchObject({
      code: 'AUTH_WRONG_PASSWORD',
    });
    expect(stats().writes).toBe(0);
    const first = await service.requestDeletion(account.id, 'secret', 'ip-hash');
    const second = await service.requestDeletion(account.id, 'secret', 'ip-hash');
    expect(second).toEqual(first);
    expect(await service.getDeletionRequest(account.id)).toBe(first.requestedAt);
    expect(stats().writes).toBe(1);
  });

  it('xuất dữ liệu web có che định danh và không chứa MaBN', async () => {
    const { service, stats } = makeService();
    const data = await service.exportData(account.id, 'ip-hash');
    const json = JSON.stringify(data);
    expect(data.account.cccdMasked).toBe('********0001');
    expect(data.account.phoneMasked).toBe('090****001');
    expect(data.appointments[0]).toMatchObject({ code: 'MQ001', amountVnd: 220000 });
    expect(json).not.toContain('079090000001');
    expect(json).not.toContain('0900000001');
    expect(json).not.toContain('mau@example.com');
    expect(json).not.toContain('MaBN');
    expect(stats().exports).toBe(1);
  });
});
