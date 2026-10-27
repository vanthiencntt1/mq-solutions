import { z } from 'zod';

// A04 mục 2: chỉ nhận cấu trúc đã biết, không lưu HTML tự do. URL chỉ dùng HTTPS hoặc đường dẫn nội bộ.
export const ContentUrlSchema = z
  .string()
  .max(2048)
  .refine((value) => {
    if (value.startsWith('/')) return !value.startsWith('//') && !value.includes('\\') && !/\s/.test(value);
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && Boolean(url.hostname) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, 'Đường dẫn phải là HTTPS hoặc đường dẫn nội bộ');

export const InlineSchema = z.object({
  text: z.string().max(10000),
  marks: z
    .array(z.enum(['bold', 'italic', 'underline', 'code']))
    .max(4)
    .optional(),
  href: ContentUrlSchema.optional(),
});
export type Inline = z.infer<typeof InlineSchema>;

const RichTextSchema = z.array(InlineSchema).min(1).max(100);

export const HeadingBlockSchema = z.object({
  type: z.literal('heading'),
  level: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  text: z.string().min(1).max(240),
});
export const ParagraphBlockSchema = z.object({ type: z.literal('paragraph'), content: RichTextSchema });
export const ListBlockSchema = z.object({
  type: z.literal('list'),
  ordered: z.boolean().default(false),
  items: z.array(RichTextSchema).min(1).max(100),
});
export const ImageBlockSchema = z.object({
  type: z.literal('image'),
  src: ContentUrlSchema,
  alt: z.string().min(1).max(300),
  caption: z.string().max(500).optional(),
  width: z.number().int().min(1).max(6000),
  height: z.number().int().min(1).max(6000),
});
export const QuoteBlockSchema = z.object({
  type: z.literal('quote'),
  content: RichTextSchema,
  attribution: z.string().max(240).optional(),
});
export const TableBlockSchema = z
  .object({
    type: z.literal('table'),
    headers: z.array(z.string().max(300)).min(1).max(12),
    rows: z.array(z.array(z.string().max(2000)).min(1).max(12)).max(100),
  })
  .refine((table) => table.rows.every((row) => row.length === table.headers.length), 'Số cột không khớp');
export const CalloutBlockSchema = z.object({
  type: z.literal('callout'),
  tone: z.enum(['info', 'warning', 'success']).default('info'),
  title: z.string().max(240).optional(),
  content: RichTextSchema,
});
export const FaqBlockSchema = z.object({
  type: z.literal('faq'),
  items: z
    .array(z.object({ question: z.string().min(1).max(500), answer: RichTextSchema }))
    .min(1)
    .max(50),
});
export const ButtonBlockSchema = z.object({
  type: z.literal('button'),
  label: z.string().min(1).max(100),
  href: ContentUrlSchema,
});
export const VideoBlockSchema = z.object({
  type: z.literal('video'),
  youtubeId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  title: z.string().min(1).max(240),
});

export const ContentBlockSchema = z.union([
  HeadingBlockSchema,
  ParagraphBlockSchema,
  ListBlockSchema,
  ImageBlockSchema,
  QuoteBlockSchema,
  TableBlockSchema,
  CalloutBlockSchema,
  FaqBlockSchema,
  ButtonBlockSchema,
  VideoBlockSchema,
]);
export const ContentBlocksSchema = z.array(ContentBlockSchema).max(300);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;
export type ContentBlocks = z.infer<typeof ContentBlocksSchema>;
