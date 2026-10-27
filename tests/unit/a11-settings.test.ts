import { describe, expect, it } from 'vitest';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import {
  SettingsService,
  type SettingsCache,
  type SettingsRepository,
} from '@/lib/services/settings/settings-service';
import { accessiblePrimaryColor, defaultSettings, parseSetting } from '@/lib/services/settings/schemas';

const superAdmin: AdminPrincipal = {
  id: 'admin-1',
  role: 'SUPER_ADMIN',
  facilityIds: null,
  name: 'Quản trị',
  permissions: ['*'],
};

function fake() {
  const rows = new Map<string, unknown>();
  const audits: { key: string; actorId: string; before: unknown; after: unknown }[] = [];
  const entries = new Map<string, unknown>();
  const ttls: number[] = [];
  const repo: SettingsRepository = {
    list: async () => [...rows].map(([key, value]) => ({ key, value })),
    save: async (key, value, actorId) => {
      const before = rows.get(key);
      if (JSON.stringify(before) === JSON.stringify(value)) return false;
      rows.set(key, value);
      audits.push({ key, actorId, before, after: value });
      return true;
    },
  };
  const cache: SettingsCache = {
    get: async (key) => entries.get(key) ?? null,
    set: async (key, value, ttl) => {
      entries.set(key, value);
      ttls.push(ttl);
    },
    del: async (key) => {
      entries.delete(key);
    },
  };
  return { settings: new SettingsService(repo, cache, 'settings:all:v1', 300), rows, audits, entries, ttls };
}

describe('A11 cấu hình hệ thống', () => {
  it('trả mặc định khi chưa có bản ghi và cache tối đa 5 phút', async () => {
    const { settings, rows, ttls } = fake();
    const first = await settings.read();
    expect(first).toEqual(defaultSettings());
    rows.set('contact', { hotline: '1900 1234', email: 'a@example.com' });
    expect((await settings.read()).contact.hotline).toBe('1900 0000');
    expect(ttls).toEqual([300]);
  });

  it('chỉ SUPER_ADMIN được lưu, không ghi khi dữ liệu sai', async () => {
    const { settings, audits } = fake();
    await expect(settings.update({ ...superAdmin, role: 'OPERATOR' }, 'booking', {})).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(settings.update(superAdmin, 'booking', { holdMinutes: 0 })).rejects.toMatchObject({
      name: 'ZodError',
    });
    expect(audits).toHaveLength(0);
  });

  it('làm đậm màu chưa đạt AA, lưu và làm mới cache', async () => {
    const { settings, audits, entries } = fake();
    await settings.read();
    const result = await settings.update(superAdmin, 'brand', {
      name: 'MQ Solutions',
      primaryColor: '#ffffff',
    });
    expect(result.changed).toBe(true);
    expect(audits).toHaveLength(1);
    expect(audits[0]?.actorId).toBe('admin-1');
    expect(entries.size).toBe(0);
    const color = (result.value as { primaryColor: string }).primaryColor;
    expect(color).not.toBe('#ffffff');
    expect(accessiblePrimaryColor(color)).toBe(color);
    expect((await settings.publicSettings()).brand.primaryHoverColor).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('không ghi audit hoặc xóa cache khi lưu lại giá trị không đổi', async () => {
    const { settings, audits, entries } = fake();
    await settings.update(superAdmin, 'maintenance', defaultSettings().maintenance);
    await settings.read();
    expect((await settings.update(superAdmin, 'maintenance', defaultSettings().maintenance)).changed).toBe(
      false,
    );
    expect(audits).toHaveLength(1);
    expect(entries.size).toBe(1);
  });

  it('không đưa chính sách tài khoản hoặc email gửi vào cấu hình công khai', async () => {
    const { settings } = fake();
    const publicSettings = await settings.publicSettings();
    expect(publicSettings).not.toHaveProperty('auth');
    expect(publicSettings).not.toHaveProperty('email');
    expect(publicSettings.maintenance.bookingOnly).toBe(false);
  });

  it('Zod từ chối trường lạ và URL không an toàn', () => {
    expect(() => parseSetting('brand', { name: 'MQ', primaryColor: '#006bff', extra: 'x' })).toThrow();
    expect(() => parseSetting('contact', { facebook: 'javascript:alert(1)' })).toThrow();
  });
});
