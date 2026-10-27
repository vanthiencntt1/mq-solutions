import { prismaAdminReviewRepository } from '@/lib/infra/db/review-admin-repository';
import { CACHE_TTL, cacheKeys, redisCache } from '@/lib/infra/redis/client';
import { AdminReviewService } from './admin-review-service';

let instance: AdminReviewService | undefined;
export function getAdminReviewService(): AdminReviewService {
  instance ??= new AdminReviewService({
    repo: prismaAdminReviewRepository,
    cache: {
      get: (id) => redisCache.get(cacheKeys.reviewSummary(id)),
      set: (id, value) => redisCache.set(cacheKeys.reviewSummary(id), value, CACHE_TTL.reviewSummary),
      del: (id) => redisCache.del(cacheKeys.reviewSummary(id)),
    },
  });
  return instance;
}
