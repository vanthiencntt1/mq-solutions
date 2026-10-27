import type { RateLimiter, TokenVersionCache } from '@/lib/domain/account/ports';
import { getRedis } from './client';

// Giới hạn tần suất cửa sổ cố định: INCR + EXPIRE (chỉ đặt hạn ở lần đầu).
export const redisRateLimiter: RateLimiter = {
  async hit(key, limit, windowSec) {
    const r = getRedis();
    const k = `rl:${key}`;
    const [[, count]] = (await r.multi().incr(k).expire(k, windowSec, 'NX').exec()) as [
      [null, number],
      unknown,
    ];
    return { allowed: count <= limit, count };
  },
};

export const redisTokenVersionCache: TokenVersionCache = {
  async get(id) {
    const v = await getRedis().get(`tv:${id}`);
    return v === null ? null : Number(v);
  },
  async set(id, tv) {
    await getRedis().set(`tv:${id}`, String(tv), 'EX', 60);
  },
  async del(id) {
    await getRedis().del(`tv:${id}`);
  },
};
