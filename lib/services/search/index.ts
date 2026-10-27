import { prismaSearchRepository } from '@/lib/infra/db/search-repository';
import { redisSearchCatalog } from '@/lib/infra/db/search-catalog';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { SearchService } from './search-service';

let instance: SearchService | undefined;

export function getSearchService(): SearchService {
  instance ??= new SearchService({
    repository: prismaSearchRepository,
    catalog: redisSearchCatalog,
    limiter: redisRateLimiter,
  });
  return instance;
}

export { SearchService } from './search-service';
