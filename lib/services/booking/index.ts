import { createHash } from 'node:crypto';
import { getEnv } from '@/lib/config/env';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import { prismaBookingAccount, prismaBookingRepository } from '@/lib/infra/db/booking-repository';
import { hisClient } from '@/lib/infra/his';
import { logger } from '@/lib/infra/logger';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { getRedis, redisCache } from '@/lib/infra/redis/client';
import { getBookingDraftService, getCatalogService } from '@/lib/services/catalog';
import { getIdentityService } from '@/lib/services/identity';
import { BookingService } from './booking-service';

const idemKey = (accountId: string, key: string) =>
  `booking:idem:${accountId}:${createHash('sha256').update(key).digest('hex')}`;

// C06: SET NX chặn hai request cùng key đồng thời; kết quả giữ 24 giờ cho retry từ trình duyệt.
const redisIdempotency = {
  read: (accountId: string, key: string) => getRedis().get(idemKey(accountId, key)),
  async begin(accountId: string, key: string) {
    return (await getRedis().set(idemKey(accountId, key), 'PENDING', 'EX', 60, 'NX')) === 'OK';
  },
  async complete(accountId: string, key: string, code: string) {
    await getRedis().set(idemKey(accountId, key), code, 'EX', 24 * 60 * 60);
  },
  async release(accountId: string, key: string) {
    const k = idemKey(accountId, key);
    if ((await getRedis().get(k)) === 'PENDING') await getRedis().del(k);
  },
};

let instance: BookingService | undefined;

export function getBookingService(): BookingService {
  if (!instance) {
    const env = getEnv();
    const pii = piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET);
    instance = new BookingService({
      drafts: getBookingDraftService(),
      catalog: getCatalogService(),
      identity: getIdentityService(),
      accounts: prismaBookingAccount(pii),
      booking: prismaBookingRepository,
      his: hisClient,
      cache: redisCache,
      mailer: smtpMailer,
      idempotency: redisIdempotency,
      onMailError: (code) => logger.warn({ appointmentCode: code }, 'booking.email_failed'),
    });
  }
  return instance;
}

export { BookingService } from './booking-service';
