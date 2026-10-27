import { AppError } from '@/lib/domain/errors';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import {
  accessiblePrimaryColor,
  defaultSettings,
  parseSetting,
  primaryHoverColor,
  settingKeys,
  type SettingKey,
  type Settings,
} from './schemas';

export interface SettingsRepository {
  list(): Promise<{ key: string; value: unknown }[]>;
  // A11 mục 2: lưu và ghi CONFIG_CHANGE trong cùng giao dịch DB.
  save(key: SettingKey, value: Settings[SettingKey], actorId: string): Promise<boolean>;
}

export interface SettingsCache {
  get(key: string): Promise<unknown | null>;
  set(key: string, value: Settings, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

function parseAll(value: unknown): Settings | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  try {
    return Object.fromEntries(settingKeys.map((key) => [key, parseSetting(key, record[key])])) as Settings;
  } catch {
    return null;
  }
}

export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly cache: SettingsCache,
    private readonly cacheKey: string,
    private readonly cacheSeconds: number,
  ) {}

  async read(): Promise<Settings> {
    // A11 mục 2: Redis là cache tối đa 5 phút; lỗi cache không chặn đọc từ DB.
    try {
      const cached = parseAll(await this.cache.get(this.cacheKey));
      if (cached) return cached;
    } catch {
      // DB vẫn là nguồn dữ liệu chính.
    }

    const overrides: Partial<Settings> = {};
    for (const row of await this.repo.list()) {
      if (settingKeys.includes(row.key as SettingKey)) {
        const key = row.key as SettingKey;
        // Giá trị đã lưu không hợp lệ phải được phát hiện, tránh bật sai bảo trì/bảo mật.
        Object.assign(overrides, { [key]: parseSetting(key, row.value) });
      }
    }
    const settings = { ...defaultSettings(), ...overrides };
    try {
      await this.cache.set(this.cacheKey, settings, this.cacheSeconds);
    } catch {
      // Đọc DB đã thành công; cache có thể hồi phục ở lần sau.
    }
    return settings;
  }

  async update(actor: AdminPrincipal, key: SettingKey, input: unknown) {
    if (actor.role !== 'SUPER_ADMIN' || actor.facilityIds !== null) throw new AppError('FORBIDDEN');
    const parsed = parseSetting(key, input);
    const value =
      key === 'brand'
        ? { ...parsed, primaryColor: accessiblePrimaryColor((parsed as Settings['brand']).primaryColor) }
        : parsed;
    const changed = await this.repo.save(key, value, actor.id);
    if (changed) {
      try {
        await this.cache.del(this.cacheKey);
      } catch {
        // TTL 5 phút vẫn bảo đảm giới hạn hiệu lực khi Redis tạm lỗi.
      }
    }
    return { key, value, changed };
  }

  async publicSettings() {
    const { brand, contact, seo, maintenance, legal, booking } = await this.read();
    return {
      brand: { ...brand, primaryHoverColor: primaryHoverColor(brand.primaryColor) },
      contact,
      seo,
      maintenance,
      legal,
      booking: { holdMinutes: booking.holdMinutes },
    };
  }
}
