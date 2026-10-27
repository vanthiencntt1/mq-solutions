import { z } from 'zod';
import { DEFAULT_PRIMARY_COLOR } from '@/lib/config/brand-colors';

// A11 mục 1: chỉ nhận đường dẫn ảnh nội bộ và URL HTTPS để không đưa javascript: vào giao diện công khai.
const asset = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value || /^\/uploads\/[A-Za-z0-9/_-]+\.(?:png|jpe?g|webp|svg|ico)$/.test(value));
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value || /^https:\/\/[^\s]+$/i.test(value));
const text = (max: number) => z.string().trim().max(max);
const hour = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export const settingSchemas = {
  brand: z.strictObject({
    name: text(100).min(2).default('MQ Solutions'),
    logoLight: asset.default(''),
    logoDark: asset.default(''),
    favicon: asset.default(''),
    primaryColor: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default(DEFAULT_PRIMARY_COLOR),
  }),
  contact: z.strictObject({
    hotline: z
      .string()
      .trim()
      .regex(/^[+\d\s().-]{5,30}$/)
      .default('1900 0000'),
    email: z.email().max(254).default('hotro@mqsolutions.vn'),
    address: text(300).default(''),
    taxCode: z
      .string()
      .trim()
      .regex(/^(?:|\d{10}(?:-\d{3})?)$/)
      .default(''),
    facebook: httpsUrl.default(''),
    zalo: httpsUrl.default(''),
    youtube: httpsUrl.default(''),
    tiktok: httpsUrl.default(''),
  }),
  seo: z.strictObject({
    title: text(70).min(2).default('MQ Solutions – Đặt khám trực tuyến'),
    description: text(160).default('Đặt lịch khám trực tuyến tại các cơ sở y tế trên MQ Solutions.'),
    ogImage: asset.default(''),
    ga4Id: z
      .string()
      .trim()
      .regex(/^(?:|G-[A-Z0-9]{4,20})$/)
      .default(''),
    searchConsoleCode: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9_-]{0,150}$/)
      .default(''),
  }),
  auth: z.strictObject({
    passwordMode: z.enum(['RANDOM_EMAIL', 'BIRTH_YEAR']).default('RANDOM_EMAIL'),
    minLength: z.number().int().min(8).max(64).default(8),
    maxFailed: z.number().int().min(3).max(20).default(5),
    lockMinutes: z.number().int().min(1).max(1440).default(15),
    jwtHours: z.number().int().min(1).max(168).default(12),
  }),
  booking: z.strictObject({
    holdMinutes: z.number().int().min(5).max(60).default(15),
    maxOpenPerFacility: z.number().int().min(1).max(20).default(3),
    remindAt: hour.default('18:00'),
    catalogCacheMinutes: z.number().int().min(1).max(1440).default(60),
    scheduleCacheMinutes: z.number().int().min(1).max(60).default(5),
    identityCacheMinutes: z.number().int().min(1).max(120).default(30),
  }),
  rateLimit: z.strictObject({
    readPerMinute: z.number().int().min(10).max(1000).default(120),
    bookingPerMinute: z.number().int().min(1).max(100).default(10),
    contactPerHour: z.number().int().min(1).max(100).default(5),
  }),
  email: z.strictObject({
    fromAddress: z.union([z.literal(''), z.email().max(254)]).default(''),
    fromName: text(100).default('MQ Solutions'),
    alertEmail: z.union([z.literal(''), z.email().max(254)]).default(''),
  }),
  maintenance: z.strictObject({
    enabled: z.boolean().default(false),
    bookingOnly: z.boolean().default(false),
    message: text(500).default(''),
  }),
  legal: z.strictObject({
    termsVersion: text(40).default(''),
    privacyVersion: text(40).default(''),
  }),
  // G3ANALYTICS · A11 / W09 mục 6: tắt mặc định tới khi có đồng ý và mã đo hợp lệ.
  analytics: z.strictObject({
    provider: z.enum(['OFF', 'GA4', 'UMAMI']).default('OFF'),
    umamiWebsiteId: z.union([z.literal(''), z.uuid()]).default(''),
  }),
} as const;

export type SettingKey = keyof typeof settingSchemas;
export const settingKeys = Object.keys(settingSchemas) as SettingKey[];
export type Settings = { [K in SettingKey]: z.output<(typeof settingSchemas)[K]> };

export const settingKeySchema = z.enum(settingKeys as [SettingKey, ...SettingKey[]]);

export function parseSetting<K extends SettingKey>(key: K, value: unknown): Settings[K] {
  // Zod union giữ đúng kiểu mỗi nhóm khi chọn schema theo khóa động.
  return settingSchemas[key].parse(value) as Settings[K];
}

export function defaultSettings(): Settings {
  return Object.fromEntries(settingKeys.map((key) => [key, parseSetting(key, {})])) as Settings;
}

function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16)) as [number, number, number];
}

function luminance(hex: string): number {
  const channels = rgb(hex).map((part) => {
    const value = part / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (channels[0] ?? 0) + 0.7152 * (channels[1] ?? 0) + 0.0722 * (channels[2] ?? 0);
}

function darken(hex: string, factor: number): string {
  return `#${rgb(hex)
    .map((part) =>
      Math.floor(part * factor)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`;
}

// A11 mục 1 / quy ước mục 10.9: chữ trắng trên nút chính cần tương phản ít nhất 4.5:1.
export function accessiblePrimaryColor(hex: string): string {
  let color = hex.toLowerCase();
  while (1.05 / (luminance(color) + 0.05) < 4.5) color = darken(color, 0.95);
  return color;
}

export function primaryHoverColor(hex: string): string {
  return darken(hex, 0.78);
}
