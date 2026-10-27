import { z } from 'zod';
import { AppError } from '../errors';
import { ContentBlocksSchema, ContentUrlSchema } from './blocks';

// A04 mục 2: mọi trường CMS là văn bản hoặc khối JSON đã biết; URL ảnh phải đi qua thư viện tải lên.
export const AdminContentKindSchema = z.enum([
  'posts',
  'categories',
  'pages',
  'faqs',
  'banners',
  'popups',
  'menus',
  'home-blocks',
]);
export type AdminContentKind = z.infer<typeof AdminContentKindSchema>;
export const AdminContentIdSchema = z.object({ id: z.uuid() });
export const AdminContentListSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

const SlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const OptionalSlugSchema = z.union([SlugSchema, z.literal('')]).optional();
const TextSchema = z.string().trim().min(1).max(240);
const OptionalTextSchema = z.string().trim().max(500).nullable().optional();
const ImageUrlSchema = z.string().regex(/^\/uploads\/[a-zA-Z0-9/_-]+\.(?:jpg|png|webp)$/);
const DateSchema = z.iso.datetime({ offset: true });
const StatusSchema = z.enum(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']);

export const PostInputSchema = z.object({
  title: TextSchema,
  slug: OptionalSlugSchema,
  excerpt: OptionalTextSchema,
  coverUrl: ImageUrlSchema.nullable().optional(),
  blocks: ContentBlocksSchema,
  categoryId: z.uuid(),
  tags: z.array(TextSchema).max(20).default([]),
  facilityIds: z.array(z.uuid()).max(100).default([]),
  specialtyTags: z.array(TextSchema).max(20).default([]),
  authorName: OptionalTextSchema,
  reviewerName: OptionalTextSchema,
  status: StatusSchema.default('DRAFT'),
  publishedAt: DateSchema.nullable().optional(),
  seoTitle: z.string().trim().max(70).nullable().optional(),
  seoDesc: z.string().trim().max(160).nullable().optional(),
});
export const CategoryInputSchema = z.object({
  name: TextSchema,
  slug: OptionalSlugSchema,
  sortOrder: z.number().int().min(0).max(10000).default(0),
});
export const PageInputSchema = z.object({
  title: TextSchema,
  slug: OptionalSlugSchema,
  blocks: ContentBlocksSchema,
  version: z.string().trim().min(1).max(40),
  effectiveAt: DateSchema,
  requireReconsent: z.boolean().default(false),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});
export const FaqInputSchema = z.object({
  groupName: TextSchema,
  question: z.string().trim().min(1).max(500),
  answer: ContentBlocksSchema,
  sortOrder: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});
const ActiveWindowSchema = z.object({
  startAt: DateSchema.nullable().optional(),
  endAt: DateSchema.nullable().optional(),
  active: z.boolean().default(true),
});
export const BannerInputSchema = ActiveWindowSchema.extend({
  placement: TextSchema,
  imageUrl: ImageUrlSchema,
  imageMobileUrl: ImageUrlSchema.nullable().optional(),
  title: OptionalTextSchema,
  link: ContentUrlSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).max(10000).default(0),
});
export const PopupInputSchema = ActiveWindowSchema.extend({
  imageUrl: ImageUrlSchema,
  link: ContentUrlSchema.nullable().optional(),
  pages: z.array(z.string().startsWith('/').max(200)).min(1).max(30),
  frequency: z.enum(['ONCE_SESSION', 'ONCE_DAY']),
});
export const MenuInputSchema = z.object({
  location: z.enum(['HEADER', 'FOOTER_COL_1', 'FOOTER_COL_2', 'FOOTER_COL_3']),
  parentId: z.uuid().nullable().optional(),
  label: TextSchema,
  href: z
    .string()
    .startsWith('/')
    .max(500)
    .refine((v) => !v.startsWith('//') && !v.includes('\\')),
  sortOrder: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
});
export const HomeBlockInputSchema = z.object({
  page: z.enum(['HOME']),
  type: z.enum(['CONTENT']),
  blocks: ContentBlocksSchema,
  sortOrder: z.number().int().min(0).max(10000).default(0),
  active: z.boolean().default(true),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
});

export const AdminContentInputSchemas = {
  posts: PostInputSchema,
  categories: CategoryInputSchema,
  pages: PageInputSchema,
  faqs: FaqInputSchema,
  banners: BannerInputSchema,
  popups: PopupInputSchema,
  menus: MenuInputSchema,
  'home-blocks': HomeBlockInputSchema,
} as const;
export type AdminContentInput = {
  [K in AdminContentKind]: { kind: K; value: z.infer<(typeof AdminContentInputSchemas)[K]> };
}[AdminContentKind];

export function parseAdminContentInput(kind: AdminContentKind, raw: unknown): AdminContentInput {
  const parsed = AdminContentInputSchemas[kind].safeParse(raw);
  if (!parsed.success) throw new AppError('VALIDATION_FAILED', undefined, parsed.error.issues);
  return { kind, value: parsed.data } as AdminContentInput;
}

// A04 mục 4: dán HTML vào văn bản chỉ giữ phần chữ; script/style bị loại bỏ hoàn toàn.
export function sanitizeBlocks(raw: unknown): z.infer<typeof ContentBlocksSchema> {
  const clean = (value: unknown): unknown => {
    if (typeof value === 'string')
      return value.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '').replace(/<[^>]*>/g, '');
    if (Array.isArray(value)) return value.map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clean(item)]));
    return value;
  };
  return ContentBlocksSchema.parse(clean(raw));
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 160);
}

export function publicPaths(kind: AdminContentKind, slug?: string): string[] {
  if (kind === 'posts' || kind === 'categories') return ['/tin-tuc', ...(slug ? [`/tin-tuc/${slug}`] : [])];
  if (kind === 'pages')
    return [
      '/huong-dan',
      ...(slug ? [`/huong-dan/${slug.replace(/^huong-dan-/, '')}`, `/chinh-sach/${slug}`] : []),
    ];
  if (kind === 'faqs') return ['/huong-dan/cau-hoi-thuong-gap'];
  return ['/'];
}
