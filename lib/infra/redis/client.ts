import Redis from 'ioredis';
import type { CacheStore } from '@/lib/domain/ports';

const globalForRedis = globalThis as unknown as { redis?: Redis };

export function getRedis(): Redis {
  if (!globalForRedis.redis) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error('Chưa cấu hình REDIS_URL');
    globalForRedis.redis = new Redis(url, { maxRetriesPerRequest: null, lazyConnect: false });
  }
  return globalForRedis.redis;
}

/** Cache JSON có TTL – dùng cho dữ liệu ApiDatKham, kết quả tra hồ sơ, draft (C09 mục 2). */
export const redisCache: CacheStore = {
  async get<T>(key: string) {
    const raw = await getRedis().get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set(key, value, ttlSeconds) {
    await getRedis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  },
  async del(key) {
    await getRedis().del(key);
  },
};

/** Khóa cache thống nhất (C09 mục 2). */
export const cacheKeys = {
  hisSubjects: (facility: string) => `his:${facility}:subjects`,
  hisDoctors: (facility: string) => `his:${facility}:doctors`,
  hisRooms: (facility: string, subject: string) => `his:${facility}:rooms:${subject}`,
  hisSchedules: (facility: string, room: string) => `his:${facility}:sched:${room}`,
  hisSlots: (facility: string, room: string, date: string) => `his:${facility}:slots:${room}:${date}`,
  hisSerial: (facility: string, room: string, date: string) => `his:${facility}:serial:${room}:${date}`,
  hisPrices: (facility: string) => `his:${facility}:prices`,
  hisCatalog: (facility: string, kind: string) => `his:${facility}:cat:${kind}`,
  ident: (accountId: string, facility: string) => `ident:${accountId}:${facility}`,
  draft: (sessionId: string) => `draft:${sessionId}`,
  slotHold: (facility: string, room: string, date: string, n: number) =>
    `slot:${facility}:${room}:${date}:${n}`,
  // W05: danh mục đã gộp từ các cơ sở, chỉ đọc nếu job đã tạo cache.
  aggSpecialties: () => 'agg:specialties',
  aggDoctors: () => 'agg:doctors',
  // A09: điểm trung bình chỉ gồm đánh giá đã duyệt.
  reviewSummary: (facilityId: string) => `review:summary:${facilityId}`,
  // A11: toàn bộ cấu hình hệ thống được đọc cùng nhau để giữ snapshot nhất quán.
  settingsAll: () => 'settings:all:v1',
  // A07/C09: khóa riêng từng cơ sở và ngày khám cho job và lần chạy tay.
  reconcileLock: (facilityId: string, date: string) => `reconcile:lock:${facilityId}:${date}`,
  // A07: một email tổng hợp cho mỗi cơ sở và ngày khám, kể cả khi admin chạy lại.
  reconcileAlert: (facilityId: string, date: string) => `reconcile:alert:${facilityId}:${date}`,
} as const;

/** TTL (giây) theo C09 mục 2. */
export const CACHE_TTL = {
  catalog: 60 * 60,
  schedule: 5 * 60,
  serial: 60,
  ident: 30 * 60,
  draft: 30 * 60,
  adminCatalog: 24 * 60 * 60,
  slotHold: 15 * 60,
  // A09: làm mới định kỳ, xóa ngay khi trạng thái duyệt thay đổi.
  reviewSummary: 5 * 60,
  // A11 mục 2: thay đổi có hiệu lực trong tối đa 5 phút.
  settings: 5 * 60,
  // A07: đủ dài cho hai lần gọi HIS và giao dịch ghi kết quả.
  reconcileLock: 10 * 60,
  // A07: giữ dấu đã cảnh báo qua các lần chạy lại trong tuần.
  reconcileAlert: 7 * 24 * 60 * 60,
} as const;
