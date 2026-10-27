import { z } from 'zod';
import type { PaymentQrStore } from '@/lib/domain/payment/ports';
import { getRedis } from '@/lib/infra/redis/client';

const qrSchema = z.object({
  bankCode: z.string(),
  accountNo: z.string(),
  accountName: z.string(),
  amount: z.number().int(),
  content: z.string(),
  qrImageUrl: z.url(),
  expiresAt: z.coerce.date(),
});

const key = (code: string) => `payment:qr:${code}`;

export const redisPaymentQrStore: PaymentQrStore = {
  async get(code) {
    const raw = await getRedis().get(key(code));
    return raw ? qrSchema.parse(JSON.parse(raw)) : null;
  },
  async set(code, qr) {
    const ttl = Math.max(1, Math.ceil((qr.expiresAt.getTime() - Date.now()) / 1000));
    await getRedis().set(key(code), JSON.stringify(qr), 'EX', ttl);
  },
};
