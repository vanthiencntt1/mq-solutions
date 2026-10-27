import { unstable_cache } from 'next/cache';
import { z } from 'zod';
import { FOOTER_COLUMNS, MAIN_NAV, SITE, type NavItem, type PublicShell } from '@/lib/config/site';
import { prisma } from '@/lib/infra/db/prisma';
import { redisCache } from '@/lib/infra/redis/client';
import { getCatalogService } from './catalog';
import { getHomeSpecialties } from './site-content';
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

const HOME_STATS_KEY = 'home:stats:v1';
const HOME_STATS_TTL_SECONDS = 60 * 60;

export interface HomeStatsData {
  facilityCount: number;
  specialtyCount?: number;
  doctorCount?: number;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Home stats timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export interface HomeStatsDependencies {
  facilities: () => Promise<FacilityCard[]>;
  specialties: () => Promise<unknown[]>;
  doctors: (code: string) => Promise<unknown[]>;
  cache?: {
    get: (key: string) => Promise<HomeStatsData | null>;
    set: (key: string, value: HomeStatsData, ttl: number) => Promise<void>;
  };
}

/** Số liệu công khai, chỉ tính trên các cơ sở ACTIVE. Thiếu HIS thì ẩn chỉ số tương ứng. */
export async function getHomeStats(
  deps: HomeStatsDependencies = {
    facilities: readActive,
    specialties: () =>
      getHomeSpecialties().then((groups) =>
        groups.filter((group) => group.facilities.some(({ facility }) => !facility.name.includes('(mẫu)'))),
      ),
    doctors: (code) => getCatalogService().doctors(code),
    cache: redisCache,
  },
): Promise<HomeStatsData> {
  if (deps.cache) {
    const cached = await withTimeout(deps.cache.get(HOME_STATS_KEY), 300).catch(() => null);
    if (cached) return cached;
  }
  const facilities = (await withTimeout(deps.facilities(), 1800).catch(() => [] as FacilityCard[])).filter(
    (facility) => !facility.name.includes('(mẫu)'),
  );
  const result: HomeStatsData = { facilityCount: facilities.length };
  if (!facilities.length) return result;

  const [specialties, doctors] = await Promise.all([
    withTimeout(deps.specialties(), 2200)
      .then((rows) => rows.length)
      .catch(() => undefined),
    Promise.allSettled(facilities.map((facility) => withTimeout(deps.doctors(facility.code), 2200))),
  ]);
  if (specialties) result.specialtyCount = specialties;
  if (doctors.every((entry) => entry.status === 'fulfilled')) {
    result.doctorCount = doctors.reduce(
      (sum, entry) => sum + (entry.status === 'fulfilled' ? entry.value.length : 0),
      0,
    );
  }
  if (deps.cache)
    await withTimeout(deps.cache.set(HOME_STATS_KEY, result, HOME_STATS_TTL_SECONDS), 300).catch(
      () => undefined,
    );
  return result;
}
