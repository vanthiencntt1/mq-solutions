import { randomUUID } from 'node:crypto';
import { getEnv } from '@/lib/config/env';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import { prismaAuditWriter } from '@/lib/infra/db/account-repository';
import { prismaFacilityDirectory } from '@/lib/infra/db/identity-repository';
import { hisClient } from '@/lib/infra/his';
import { redisCache } from '@/lib/infra/redis/client';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { getIdentityService } from '@/lib/services/identity';
import { RecordsService } from './records-service';

let instance: RecordsService | undefined;
export function getRecordsService(): RecordsService {
  if (!instance) {
    const env = getEnv();
    instance = new RecordsService({
      identity: getIdentityService(),
      facilities: prismaFacilityDirectory,
      his: hisClient,
      cache: redisCache,
      limiter: redisRateLimiter,
      audit: prismaAuditWriter,
      pii: piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET),
      now: () => new Date(),
      token: randomUUID,
    });
  }
  return instance;
}

export { RecordsService } from './records-service';
