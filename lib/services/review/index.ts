import { prismaReviewRepository } from '@/lib/infra/db/review-repository';
import { CACHE_TTL, cacheKeys, redisCache } from '@/lib/infra/redis/client';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { ReviewService } from './review-service';

let instance: ReviewService | undefined;
export function getReviewService(): ReviewService {
  instance ??= new ReviewService({
    repo: prismaReviewRepository,
    cache: {
      get: (id) => redisCache.get(cacheKeys.reviewSummary(id)),
      set: (id, value) => redisCache.set(cacheKeys.reviewSummary(id), value, CACHE_TTL.reviewSummary),
      del: (id) => redisCache.del(cacheKeys.reviewSummary(id)),
    },
    limiter: redisRateLimiter,
  });
  return instance;
}
