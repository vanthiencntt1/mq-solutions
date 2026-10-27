import { z } from 'zod';

export const feedbackTopicSchema = z.enum(['GOPY', 'KHIEU_NAI', 'HO_TRO', 'KHAC']);
export const feedbackStatusSchema = z.enum(['NEW', 'IN_PROGRESS', 'DONE']);

// A09 mục 3: giới hạn nội dung để không biến form hỗ trợ thành nơi tải dữ liệu lớn.
export const createFeedbackSchema = z.object({
  topic: feedbackTopicSchema,
  message: z.string().trim().min(10).max(2000),
  appointmentId: z.uuid().nullable().optional(),
});

export const feedbackListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminFeedbackListSchema = feedbackListSchema.extend({
  status: z.preprocess((value) => (value === '' ? undefined : value), feedbackStatusSchema.optional()),
  facilityId: z.preprocess((value) => (value === '' ? undefined : value), z.uuid().optional()),
});

export const updateFeedbackSchema = z
  .object({
    status: feedbackStatusSchema.optional(),
    assignee: z.uuid().nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.assignee !== undefined);

export const feedbackIdSchema = z.object({ id: z.uuid() });

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type FeedbackListQuery = z.infer<typeof feedbackListSchema>;
export type AdminFeedbackListQuery = z.infer<typeof adminFeedbackListSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
