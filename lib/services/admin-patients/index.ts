import { randomInt, randomUUID } from 'node:crypto';
import { getEnv } from '@/lib/config/env';
import { argon2Hasher } from '@/lib/infra/auth/password-hasher';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import { prismaAdminPatientRepository } from '@/lib/infra/db/admin-patient-repository';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { getRedis } from '@/lib/infra/redis/client';
import { redisRateLimiter, redisTokenVersionCache } from '@/lib/infra/redis/rate-limiter';
import { storage } from '@/lib/infra/storage/local-storage';
import { AdminPatientsService } from './admin-patients-service';

let instance: AdminPatientsService | undefined;

export function getAdminPatientsService(): AdminPatientsService {
  if (!instance) {
    const env = getEnv();
    instance = new AdminPatientsService({
      repo: prismaAdminPatientRepository,
      pii: piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET),
      hasher: argon2Hasher,
      limiter: redisRateLimiter,
      tvCache: redisTokenVersionCache,
      mailer: smtpMailer,
      storage,
      // C03: cache định danh nằm theo tài khoản + mã cơ sở, nên mọi sửa định danh phải xóa tất cả khóa.
      async clearIdentity(accountId) {
        const redis = getRedis();
        let cursor = '0';
        do {
          const [next, keys] = await redis.scan(cursor, 'MATCH', `ident:${accountId}:*`, 'COUNT', 100);
          if (keys.length) await redis.del(...keys);
          cursor = next;
        } while (cursor !== '0');
      },
      randomInt: (max) => randomInt(max),
      randomId: () => randomUUID(),
      now: () => new Date(),
      appUrl: env.APP_URL,
    });
  }
  return instance;
}

export { AdminPatientsService } from './admin-patients-service';
export {
  PatientSearchSchema,
  PatientActionSchema,
  PatientUpdateSchema,
  PatientIdSchema,
  PatientPageSchema,
} from './schemas';
