import { z } from 'zod';

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
const envRef = z.string().regex(/^[A-Z][A-Z0-9_]{2,99}$/, 'Chỉ nhập tên biến môi trường');

// A02 mục 2: HTTP chỉ dành cho endpoint nội bộ qua VPN; chặn URL có credentials, query và fragment.
export const FacilityUrlSchema = z
  .string()
  .trim()
  .url()
  .refine((raw) => {
    const url = new URL(raw);
    if (url.username || url.password || url.search || url.hash || !['http:', 'https:'].includes(url.protocol))
      return false;
    if (url.protocol === 'https:') return true;
    return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(url.hostname);
  }, 'Cần HTTPS hoặc HTTP qua IP nội bộ/VPN');

const imageUrl = z
  .string()
  .trim()
  .regex(/^\/uploads\/[A-Za-z0-9/_.-]+$/, 'Ảnh phải là tệp đã tải lên');
const fields = {
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(100),
  name: text(200),
  type: z.enum(['BV_CONG', 'BV_TU', 'PHONG_KHAM', 'PHONG_MACH', 'XET_NGHIEM']),
  provinceName: text(100),
  address: text(500),
  lat: z.number().min(-90).max(90).nullable(),
  lng: z.number().min(-180).max(180).nullable(),
  hotline: optionalText(30),
  workingHours: z.record(z.string(), z.string().max(100)),
  logoUrl: imageUrl.nullable(),
  images: z.array(imageUrl).max(12),
  shortDesc: optionalText(500),
  introJson: z
    .array(z.object({ type: z.string().max(40), text: z.string().max(5000) }))
    .max(50)
    .nullable(),
  apiBaseUrl: FacilityUrlSchema,
  partnerCode: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]{2,40}$/),
  secretRef: envRef,
  timeoutMs: z.number().int().min(1000).max(10000),
  payProvider: z.literal('SEPAY'),
  bankCode: optionalText(20),
  bankAccountNo: z
    .string()
    .trim()
    .regex(/^\d{6,30}$/)
    .nullable()
    .optional(),
  bankAccountName: optionalText(150),
  webhookKeyRef: envRef.nullable().optional(),
  bookingMode: z.enum(['SPECIALTY', 'DOCTOR', 'BOTH']),
  allowBhyt: z.boolean(),
  allowSameDay: z.boolean(),
  payOptions: z
    .array(z.enum(['ONLINE', 'AT_FACILITY']))
    .min(1)
    .max(2)
    .refine((v) => new Set(v).size === v.length),
  cancelCutoff: z.string().regex(/^D-(0|[1-9]\d?) ([01]\d|2[0-3]):[0-5]\d$/),
  reconcileTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  featured: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
};

export const FacilityCreateSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^[A-Z0-9_]{2,20}$/),
  ...fields,
  status: z.literal('INACTIVE').default('INACTIVE'),
});
export const FacilityUpdateSchema = z
  .object(fields)
  .partial()
  .extend({
    confirmPassword: z.string().optional(),
  })
  .refine((v) => Object.keys(v).some((key) => key !== 'confirmPassword'));
export const FacilityStatusSchema = z.object({ status: z.enum(['ACTIVE', 'PAUSED', 'INACTIVE']) });
export const FacilityIdSchema = z.object({ id: z.string().uuid() });
export const FacilityListSchema = z.object({
  q: z.string().trim().max(100).default(''),
  status: z.preprocess((v) => (v === '' ? undefined : v), z.enum(['ACTIVE', 'PAUSED', 'INACTIVE']).optional()),
  province: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const FacilityMediaSchema = z.object({
  kind: z.enum(['logo', 'image']),
  mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  data: z
    .string()
    .min(1)
    .max(14 * 1024 * 1024)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export type FacilityCreateInput = z.infer<typeof FacilityCreateSchema>;
export type FacilityUpdateInput = z.infer<typeof FacilityUpdateSchema>;
export type FacilityListInput = z.infer<typeof FacilityListSchema>;
