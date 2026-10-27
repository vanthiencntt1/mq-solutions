import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { FOOTER_COLUMNS, MAIN_NAV, SITE, type NavItem, type PublicShell } from '@/lib/config/site';
import { prisma } from '@/lib/infra/db/prisma';
import { listActiveFacilities, type FacilityCard } from './facility-service';

const contactSchema = z.object({
  hotline: z.string().min(1).optional(),
  email: z.email().optional(),
  address: z.string().optional(),
  taxCode: z.string().optional(),
  zaloUrl: z.url().startsWith('https://').optional(),
  facebookUrl: z.url().startsWith('https://').optional(),
  youtubeUrl: z.url().startsWith('https://').optional(),
  tiktokUrl: z.url().startsWith('https://').optional(),
});
const brandSchema = z.object({ name: z.string().min(1).optional(), tagline: z.string().min(1).optional() });
const announcementSchema = z.object({
  enabled: z.boolean(),
  text: z.string().min(1),
  href: z.string().optional(),
});

const defaultShell: PublicShell = {
  ...SITE,
  mainNav: MAIN_NAV,
  footerColumns: FOOTER_COLUMNS,
};

function safeHref(href: string): string | undefined {
  // W01 mục 8: menu do admin nhập, chỉ nhận đường dẫn nội bộ để tránh URL không an toàn.
  return href.startsWith('/') && !href.startsWith('//') && !href.startsWith('/\\') ? href : undefined;
}

function toNavigation(
  rows: { id: string; parentId: string | null; label: string; href: string }[],
): NavItem[] {
  const children = new Map<string, NavItem[]>();
  for (const row of rows) {
    const href = safeHref(row.href);
    if (!row.parentId || !href) continue;
    const siblings = children.get(row.parentId) ?? [];
    siblings.push({ href, label: row.label });
    children.set(row.parentId, siblings);
  }
  return rows.flatMap((row) => {
    const href = safeHref(row.href);
    return !row.parentId && href ? [{ href, label: row.label, children: children.get(row.id) }] : [];
  });
}

const readShell = unstable_cache(
  async (): Promise<PublicShell> => {
    const [settings, menus] = await Promise.all([
      prisma.systemSetting.findMany({
        where: { key: { in: ['brand', 'contact', 'announcement'] } },
        select: { key: true, value: true },
      }),
      prisma.menuItem.findMany({
        where: { active: true, location: { in: ['HEADER', 'FOOTER_COL_1', 'FOOTER_COL_2', 'FOOTER_COL_3'] } },
        orderBy: { sortOrder: 'asc' },
        select: { id: true, parentId: true, label: true, href: true, location: true },
      }),
    ]);
    const values = new Map(settings.map((setting) => [setting.key, setting.value]));
    const contact = contactSchema.safeParse(values.get('contact'));
    const brand = brandSchema.safeParse(values.get('brand'));
    const notice = announcementSchema.safeParse(values.get('announcement'));
    const headerRows = menus.filter((item) => item.location === 'HEADER');
    const mainNav = toNavigation(headerRows);
    const footerColumns = FOOTER_COLUMNS.map((column, index) => {
      const links = toNavigation(menus.filter((item) => item.location === `FOOTER_COL_${index + 1}`));
      return { title: column.title, links: links.length ? links : column.links };
    });
    return {
      ...defaultShell,
      ...contact.data,
      ...brand.data,
      announcement:
        notice.success && notice.data.enabled
          ? { text: notice.data.text, href: notice.data.href ? safeHref(notice.data.href) : undefined }
          : undefined,
      mainNav: mainNav.length ? mainNav : MAIN_NAV,
      footerColumns,
    };
  },
  ['w01-public-shell'],
  { revalidate: 300, tags: ['public-shell'] },
);

const readFeatured = unstable_cache(
  () => listActiveFacilities({ featuredOnly: true, take: 8 }),
  ['w02-featured-facilities'],
  { revalidate: 300, tags: ['home-facilities'] },
);

const readActive = unstable_cache(() => listActiveFacilities({ take: 100 }), ['w02-active-facilities'], {
  revalidate: 300,
  tags: ['home-facilities'],
});

export class HomeService {
  constructor(
    private readonly deps: {
      loadShell: () => Promise<PublicShell>;
      listFeatured: () => Promise<FacilityCard[]>;
      listActive: () => Promise<FacilityCard[]>;
    },
  ) {}

  async getShell(): Promise<PublicShell> {
    // W01 mục 8: khi admin chưa thiết lập hoặc DB tạm lỗi, menu công khai vẫn có lối vào cơ bản.
    try {
      return await this.deps.loadShell();
    } catch {
      return defaultShell;
    }
  }

  async getFeaturedFacilities(): Promise<FacilityCard[]> {
    return this.deps.listFeatured();
  }

  async getActiveFacilities(): Promise<FacilityCard[]> {
    return this.deps.listActive();
  }
}

const homeService = new HomeService({
  loadShell: readShell,
  listFeatured: readFeatured,
  listActive: readActive,
});

export function getHomeService(): HomeService {
  return homeService;
}
