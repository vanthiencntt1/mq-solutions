import { z } from 'zod';
import { ContentBlocksSchema, ContentUrlSchema } from '@/lib/domain/content/blocks';
import { FOOTER_COLUMNS, MAIN_NAV, SITE, type NavItem, type PublicShell } from '@/lib/config/site';
import type { SiteBanner, SitePopup, SiteReview, SiteContentRepository } from '@/lib/domain/ports';

const asset = z.string().regex(/^\/uploads\/[A-Za-z0-9/_-]+\.(?:png|jpe?g|webp|svg)$/);
const menuHref = z
  .string()
  .max(500)
  .refine(
    (value) => value.startsWith('/') && !value.startsWith('//') && !value.includes('\\') && !/\s/.test(value),
  );
const blockTypes = [
  'HERO',
  'BANNER',
  'SERVICES',
  'PARTNERS',
  'FACILITIES',
  'SPECIALTIES',
  'STATS',
  'TESTIMONIALS',
  'NEWS',
  'SUPPORT',
  'STEPS',
  'BENEFITS',
  'FAQ',
  'CTA',
  'CONTENT',
] as const;
export type HomeBlockType = (typeof blockTypes)[number];

const text = z.string().trim().max(500);
const blockData = z
  .object({
    title: text.optional(),
    description: z.string().trim().max(2000).optional(),
    items: z
      .array(
        z.object({
          label: text.optional(),
          value: text.optional(),
          title: text.optional(),
          quote: z.string().max(2000).optional(),
          name: text.optional(),
          href: ContentUrlSchema.optional(),
        }),
      )
      .max(20)
      .optional(),
  })
  .passthrough();
const blockSchema = z.object({
  id: z.string(),
  page: z.string(),
  type: z.string(),
  data: z.unknown(),
  sortOrder: z.number(),
  active: z.boolean(),
  status: z.string(),
});
const bannerSchema = z.object({
  id: z.string(),
  placement: z.string(),
  imageUrl: asset,
  imageMobileUrl: asset.nullable(),
  title: text.nullable(),
  link: ContentUrlSchema.nullable(),
  startAt: z.coerce.date().nullable(),
  endAt: z.coerce.date().nullable(),
  sortOrder: z.number(),
  active: z.boolean(),
});
const popupSchema = z.object({
  id: z.string(),
  imageUrl: asset,
  link: ContentUrlSchema.nullable(),
  pages: z.array(menuHref),
  frequency: z.enum(['ONCE_SESSION', 'ONCE_DAY']),
  startAt: z.coerce.date().nullable(),
  endAt: z.coerce.date().nullable(),
  active: z.boolean(),
});
const menuSchema = z.object({
  id: z.string(),
  location: z.string(),
  parentId: z.string().nullable(),
  label: z.string().trim().min(1).max(240),
  href: menuHref,
  sortOrder: z.number(),
  active: z.boolean(),
});
const reviewSchema = z.object({
  id: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().min(1).max(2000),
  createdAt: z.coerce.date(),
});
const announcementSchema = z.object({ enabled: z.boolean(), text: text.min(1), href: menuHref.optional() });

export type HomeBlock = {
  id: string;
  type: HomeBlockType;
  sortOrder: number;
  data: z.infer<typeof blockData> | z.infer<typeof ContentBlocksSchema>;
};
export type SiteMenuRow = z.infer<typeof menuSchema>;

export function selectHomeBlocks(rows: unknown[]): HomeBlock[] {
  return rows
    .flatMap((raw) => {
      const parsed = blockSchema.safeParse(raw);
      if (!parsed.success) return [];
      const row = parsed.data;
      if (
        row.page !== 'HOME' ||
        row.status !== 'PUBLISHED' ||
        !row.active ||
        !blockTypes.includes(row.type as HomeBlockType)
      )
        return [];
      const data =
        row.type === 'CONTENT' ? ContentBlocksSchema.safeParse(row.data) : blockData.safeParse(row.data);
      return data.success
        ? [{ id: row.id, type: row.type as HomeBlockType, sortOrder: row.sortOrder, data: data.data }]
        : [];
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function composeHomeBlocks(blocks: HomeBlock[], fallbackTypes: readonly HomeBlockType[]): HomeBlock[] {
  // A04 hiện chỉ cho biên tập CONTENT: giữ các lối đặt khám mặc định khi admin thêm khối văn bản.
  if (blocks.some((block) => block.type !== 'CONTENT')) return blocks;
  return [
    ...fallbackTypes.map((type, sortOrder) => ({ id: `default-${type}`, type, sortOrder, data: {} })),
    ...blocks,
  ];
}

export function activeBanners(rows: unknown[], placement: string | null, now: Date): SiteBanner[] {
  return rows
    .flatMap((raw) => {
      const parsed = bannerSchema.safeParse(raw);
      if (!parsed.success) return [];
      const row = parsed.data;
      return row.active &&
        (!placement || row.placement === placement) &&
        (!row.startAt || row.startAt <= now) &&
        (!row.endAt || row.endAt > now)
        ? [row]
        : [];
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function activePopups(rows: unknown[], path: string, now: Date): SitePopup[] {
  return rows.flatMap((raw) => {
    const parsed = popupSchema.safeParse(raw);
    if (!parsed.success) return [];
    const row = parsed.data;
    return row.active &&
      row.pages.includes(path) &&
      (!row.startAt || row.startAt <= now) &&
      (!row.endAt || row.endAt > now)
      ? [row]
      : [];
  });
}

export function menuTree(rows: unknown[], location: string, fallback: NavItem[]): NavItem[] {
  const items = rows
    .flatMap((raw) => {
      const parsed = menuSchema.safeParse(raw);
      return parsed.success && parsed.data.active && parsed.data.location === location ? [parsed.data] : [];
    })
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!items.length) return fallback;
  const byParent = new Map<string, SiteMenuRow[]>();
  for (const item of items) {
    const siblings = byParent.get(item.parentId ?? '') ?? [];
    siblings.push(item);
    byParent.set(item.parentId ?? '', siblings);
  }
  const seen = new Set<string>();
  const children = (parent: string, depth: number): NavItem[] =>
    depth > 3
      ? []
      : (byParent.get(parent) ?? []).flatMap((item) => {
          if (seen.has(item.id)) return [];
          seen.add(item.id);
          const nested = children(item.id, depth + 1);
          return [{ href: item.href, label: item.label, ...(nested.length ? { children: nested } : {}) }];
        });
  const tree = children('', 0);
  return tree.length ? tree : fallback;
}

export class SiteContentService {
  constructor(
    private readonly repo: SiteContentRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async homeBlocks() {
    return selectHomeBlocks(await this.repo.blocks());
  }
  async banners(placement: string) {
    return activeBanners(await this.repo.banners(), placement, this.now());
  }
  async allActiveBanners() {
    return activeBanners(await this.repo.banners(), null, this.now());
  }
  async popups(path: string) {
    return activePopups(await this.repo.popups(), path, this.now());
  }
  async allActivePopups() {
    return (await this.repo.popups()).flatMap((raw) => {
      const parsed = popupSchema.safeParse(raw);
      if (!parsed.success) return [];
      const row = parsed.data;
      return row.active &&
        (!row.startAt || row.startAt <= this.now()) &&
        (!row.endAt || row.endAt > this.now())
        ? [row]
        : [];
    });
  }
  async testimonials(): Promise<SiteReview[]> {
    return (await this.repo.testimonials()).flatMap((raw) => {
      const parsed = reviewSchema.safeParse(raw);
      return parsed.success ? [parsed.data] : [];
    });
  }
  async shell(publicSettings: {
    brand: { name: string; logoDark: string };
    contact: {
      hotline: string;
      email: string;
      address: string;
      taxCode: string;
      facebook: string;
      zalo: string;
      youtube: string;
      tiktok: string;
    };
    legal: { termsVersion: string; privacyVersion: string };
  }): Promise<PublicShell> {
    const [menuResult, noticeResult] = await Promise.allSettled([
      this.repo.menus(),
      this.repo.announcement(),
    ]);
    const menus = menuResult.status === 'fulfilled' ? menuResult.value : [];
    const announcement = announcementSchema.safeParse(
      noticeResult.status === 'fulfilled' ? noticeResult.value : null,
    );
    return {
      ...SITE,
      name: publicSettings.brand.name,
      logoUrl: publicSettings.brand.logoDark,
      hotline: publicSettings.contact.hotline,
      email: publicSettings.contact.email,
      address: publicSettings.contact.address,
      taxCode: publicSettings.contact.taxCode,
      facebookUrl: publicSettings.contact.facebook,
      zaloUrl: publicSettings.contact.zalo,
      youtubeUrl: publicSettings.contact.youtube,
      tiktokUrl: publicSettings.contact.tiktok,
      termsVersion: publicSettings.legal.termsVersion,
      privacyVersion: publicSettings.legal.privacyVersion,
      announcement:
        announcement.success && announcement.data.enabled
          ? { text: announcement.data.text, href: announcement.data.href }
          : undefined,
      mainNav: menuTree(menus, 'HEADER', MAIN_NAV),
      footerColumns: FOOTER_COLUMNS.map((column, index) => ({
        title: column.title,
        links: menuTree(menus, `FOOTER_COL_${index + 1}`, column.links),
      })),
    };
  }
}
