import { z } from 'zod';
import type { RateLimiter } from '@/lib/domain/account/ports';
import type { ReviewRepository, ReviewCache } from '@/lib/domain/ports';
export type { ReviewRepository, ReviewCache, ReviewSummary, PublishedReview } from '@/lib/domain/ports';

export const CreateReviewSchema = z.object({
  appointmentId: z.uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).nullable().optional(),
});
export type CreateReviewInput = z.infer<typeof CreateReviewSchema>;

export const PublicReviewsQuerySchema = z.object({
  facilityCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_-]{2,40}$/),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(20).default(5),
});

export interface ReviewDeps {
  repo: ReviewRepository;
  cache: ReviewCache;
  limiter: RateLimiter;
}
