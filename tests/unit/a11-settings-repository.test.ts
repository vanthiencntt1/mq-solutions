import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultSettings } from '@/lib/services/settings/schemas';
import { prismaSettingsRepository } from '@/lib/infra/db/settings-repository';

const state = vi.hoisted(() => ({ value: null as unknown, writes: 0, audits: [] as unknown[] }));

vi.mock('@/lib/infra/db/prisma', () => {
  const tx = {
    systemSetting: {
      findUnique: async () => (state.value === null ? null : { value: state.value }),
      upsert: async (args: { create: { value: unknown } }) => {
        state.value = args.create.value;
        state.writes++;
      },
    },
    auditLog: {
      create: async (args: { data: unknown }) => {
        state.audits.push(args.data);
      },
    },
  };
  return {
    prisma: {
      systemSetting: { findMany: async () => [] },
      $transaction: async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx),
    },
  };
});

beforeEach(() => {
  state.value = null;
  state.writes = 0;
  state.audits.length = 0;
});

describe('A11 ghi cấu hình và nhật ký', () => {
  it('ghi CONFIG_CHANGE cùng diff từng trường trong một giao dịch', async () => {
    state.value = { ...defaultSettings().maintenance, message: 'Cũ', legacy: 'bỏ' };
    const next = { ...defaultSettings().maintenance, message: 'Đang bảo trì' };
    expect(await prismaSettingsRepository.save('maintenance', next, 'admin-1')).toBe(true);
    expect(state.writes).toBe(1);
    expect(state.audits).toEqual([
      {
        actorType: 'ADMIN',
        actorId: 'admin-1',
        action: 'CONFIG_CHANGE',
        module: 'settings',
        target: 'maintenance',
        diff: { message: { from: 'Cũ', to: 'Đang bảo trì' }, legacy: { from: 'bỏ', to: null } },
      },
    ]);
  });

  it('không ghi DB hoặc audit khi giá trị không đổi', async () => {
    const value = defaultSettings().booking;
    state.value = value;
    expect(await prismaSettingsRepository.save('booking', value, 'admin-1')).toBe(false);
    expect(state.writes).toBe(0);
    expect(state.audits).toHaveLength(0);
  });
});
