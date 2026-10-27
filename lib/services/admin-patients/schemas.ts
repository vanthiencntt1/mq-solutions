import { z } from 'zod';

export const PatientIdSchema = z.object({ id: z.uuid() });

// A05 mục 1: chỉ tra cứu có chủ đích, không mở danh sách duyệt toàn bộ.
export const PatientSearchSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('cccd'),
    q: z.string().regex(/^\d{12}$/),
    page: z.coerce.number().int().min(1).default(1),
  }),
  z.object({
    kind: z.literal('phone'),
    q: z.string().regex(/^0\d{9}$/),
    page: z.coerce.number().int().min(1).default(1),
  }),
  z.object({
    kind: z.literal('code'),
    q: z
      .string()
      .trim()
      .regex(/^[A-Za-z0-9]{6,24}$/),
    page: z.coerce.number().int().min(1).default(1),
  }),
  z.object({
    kind: z.literal('name'),
    q: z.string().trim().min(3).max(80),
    page: z.coerce.number().int().min(1).default(1),
  }),
  z.object({
    kind: z.literal('email'),
    q: z.email().max(120),
    page: z.coerce.number().int().min(1).default(1),
  }),
]);
export type PatientSearchInput = z.infer<typeof PatientSearchSchema>;

export const PatientActionSchema = z.object({
  action: z.enum(['LOCK', 'UNLOCK', 'DISPUTE', 'LOGOUT_ALL', 'RESET_PASSWORD', 'DELETE']),
  reason: z.string().trim().min(8).max(500),
});
export type PatientActionInput = z.infer<typeof PatientActionSchema>;

export const PatientUpdateSchema = z
  .object({
    cccd: z
      .string()
      .regex(/^\d{12}$/)
      .optional(),
    fullName: z
      .string()
      .trim()
      .min(2)
      .max(80)
      .regex(/^[^\d<>]+$/)
      .optional(),
    birthYear: z.number().int().min(1900).max(new Date().getFullYear()).optional(),
    gender: z.union([z.literal(0), z.literal(1)]).optional(),
    phone: z
      .string()
      .regex(/^0\d{9}$/)
      .optional(),
    email: z.email().max(120).optional(),
    reason: z.string().trim().min(8).max(500),
    evidence: z.object({
      mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
      base64: z.string().min(1).max(7_000_000),
    }),
  })
  .refine(
    (v) => Object.keys(v).some((k) => !['reason', 'evidence'].includes(k)),
    'Cần chọn thông tin cần sửa',
  );
export type PatientUpdateInput = z.infer<typeof PatientUpdateSchema>;

export const PatientPageSchema = z.object({ page: z.coerce.number().int().min(1).default(1) });
