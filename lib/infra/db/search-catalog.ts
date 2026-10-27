import { z } from 'zod';
import type { CatalogItem, SearchCatalog } from '@/lib/domain/search/ports';
import { cacheKeys, redisCache } from '@/lib/infra/redis/client';

const itemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().optional(),
  facilitySlug: z.string().optional(),
  facilityName: z.string().optional(),
  code: z.string().optional(),
  specialty: z.string().optional(),
});

async function readCatalog(key: string): Promise<CatalogItem[]> {
  const raw = await redisCache.get<unknown>(key);
  if (!Array.isArray(raw)) return [];
  // W05 mục 3: cache gộp do job khác tạo; kiểm Zod trước khi đưa dữ liệu HIS ra web.
  return raw.flatMap((entry) => {
    const parsed = itemSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}

export const redisSearchCatalog: SearchCatalog = {
  specialties: () => readCatalog(cacheKeys.aggSpecialties()),
  doctors: () => readCatalog(cacheKeys.aggDoctors()),
};
