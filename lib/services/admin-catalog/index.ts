import { prisma } from '@/lib/infra/db/prisma';
import { hisClient } from '@/lib/infra/his';
import { getRedis, redisCache, CACHE_TTL } from '@/lib/infra/redis/client';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { AdminCatalogService } from './admin-catalog-service';

const selection = { id: true, code: true, name: true, status: true, health: true } as const;

async function purgeFacility(code: string): Promise<void> {
  const redis = getRedis();
  // A03 mục 2: xóa cả cache trang admin và cache C05 mà web công khai đang dùng.
  for (const pattern of [`a03:${code}:*`, `his:${code}:*`]) {
    let cursor = '0';
    do {
      const [next, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      if (keys.length) await redis.del(...keys);
      cursor = next;
    } while (cursor !== '0');
  }
}

let instance: AdminCatalogService | undefined;

export function getAdminCatalogService(): AdminCatalogService {
  instance ??= new AdminCatalogService({
    his: hisClient,
    cache: redisCache,
    facilities: {
      list: (ids) =>
        prisma.facility.findMany({
          where: ids === null ? {} : { id: { in: ids } },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          select: selection,
        }),
      findByCode: (code) => prisma.facility.findUnique({ where: { code }, select: selection }),
    },
    limiter: redisRateLimiter,
    purge: purgeFacility,
    audit: async (actorId, facilityId, ipHash) => {
      await prisma.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CATALOG_CACHE_CLEAR',
          module: 'A03',
          facilityId,
          ipHash,
        },
      });
    },
    now: () => new Date(),
    ttl: CACHE_TTL,
  });
  return instance;
}

export { AdminCatalogService } from './admin-catalog-service';
export type { AdminCatalogFacility, CatalogView, CatalogKind } from './admin-catalog-service';
