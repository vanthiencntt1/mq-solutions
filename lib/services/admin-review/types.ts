import { z } from 'zod';
import type { AdminReviewRepository, ReviewCache } from '@/lib/domain/ports';
export type { AdminReviewRepository, AdminReviewRow, ContactRow } from '@/lib/domain/ports';

const optionalFilter = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const AdminReviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  facilityId: optionalFilter(z.uuid()),
  rating: optionalFilter(z.coerce.number().int().min(1).max(5)),
  status: optionalFilter(z.enum(['PENDING', 'SHOWN', 'HIDDEN'])),
});
export type AdminReviewQuery = z.infer<typeof AdminReviewQuerySchema>;

export const ReviewModerationSchema = z
  .object({
    status: z.enum(['SHOWN', 'HIDDEN']).optional(),
    reply: z.string().trim().max(2000).nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.reply !== undefined);
export type ReviewModerationInput = z.infer<typeof ReviewModerationSchema>;

export const ContactQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: optionalFilter(z.enum(['NEW', 'IN_PROGRESS', 'DONE'])),
});
export type ContactQuery = z.infer<typeof ContactQuerySchema>;

export const ContactUpdateSchema = z
  .object({
    status: z.enum(['NEW', 'IN_PROGRESS', 'DONE']).optional(),
    note: z.string().trim().max(2000).nullable().optional(),
    assignee: z.uuid().nullable().optional(),
  })
  .refine((v) => v.status !== undefined || v.note !== undefined || v.assignee !== undefined);
export type ContactUpdateInput = z.infer<typeof ContactUpdateSchema>;

export const AdminItemIdSchema = z.object({ id: z.uuid() });

export interface AdminReviewDeps {
  repo: AdminReviewRepository;
  cache: ReviewCache;
}
