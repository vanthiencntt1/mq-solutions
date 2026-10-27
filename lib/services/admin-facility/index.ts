import { argon2Hasher } from '@/lib/infra/auth/password-hasher';
import { prismaAdminFacilityRepository } from '@/lib/infra/db/admin-facility-repository';
import { facilityProbeClient, invalidateFacilityConnection } from '@/lib/infra/his';
import { getRedis } from '@/lib/infra/redis/client';
import { storage } from '@/lib/infra/storage/local-storage';
import { AdminFacilityService } from './admin-facility-service';

async function clearFacilityCache(code: string): Promise<number> {
  const redis = getRedis();
  let cursor = '0';
  let count = 0;
  do {
    const [next, keys] = await redis.scan(cursor, 'MATCH', `his:${code}:*`, 'COUNT', 100);
    cursor = next;
    if (keys.length) count += await redis.del(...keys);
  } while (cursor !== '0');
  return count;
}

let instance: AdminFacilityService | undefined;
export function getAdminFacilityService(): AdminFacilityService {
  if (!instance)
    instance = new AdminFacilityService({
      repo: prismaAdminFacilityRepository,
      his: facilityProbeClient,
      verifyPassword: argon2Hasher.verify,
      envHas: (ref) => Boolean(process.env[ref]),
      invalidateConnection: invalidateFacilityConnection,
      clearCache: clearFacilityCache,
      storage,
      now: () => new Date(),
      elapsed: () => performance.now(),
    });
  return instance;
}

export { AdminFacilityService } from './admin-facility-service';
