import { getEnv } from '@/lib/config/env';
import { prismaAuditWriter } from '@/lib/infra/db/account-repository';
import { prismaFacilityDirectory, prismaIdentityAccounts } from '@/lib/infra/db/identity-repository';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import { hisClient } from '@/lib/infra/his';
import { redisCache } from '@/lib/infra/redis/client';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { IdentityService } from './identity-service';

// Nối IdentityService với hạ tầng thật (Postgres, Redis, HisClient).
let instance: IdentityService | undefined;

export function getIdentityService(): IdentityService {
  if (!instance) {
    const env = getEnv();
    const pii = piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET);
    instance = new IdentityService({
      his: hisClient,
      cache: redisCache,
      limiter: redisRateLimiter,
      audit: prismaAuditWriter,
      facilities: prismaFacilityDirectory,
      accounts: prismaIdentityAccounts(pii),
      pii,
      now: () => new Date(),
    });
  }
  return instance;
}

export { IdentityService } from './identity-service';
export type { IdentView } from './identity-service';
