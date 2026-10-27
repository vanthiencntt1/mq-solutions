import { unstable_cache } from 'next/cache';
import { prismaSiteContentRepository } from '@/lib/infra/db/site-content-repository';
import { SiteContentService } from './site-content-service';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';
import { getPublicSettings } from '@/lib/services/settings';
import { defaultSettings, primaryHoverColor } from '@/lib/services/settings/schemas';

// A04 mục 2: revalidatePath('/') khi xuất bản; TTL ngắn còn bảo đảm dữ liệu cập nhật khi tag không được xóa.
const repository = {
  blocks: unstable_cache(prismaSiteContentRepository.blocks, ['g1-home-blocks'], {
    revalidate: 60,
    tags: ['site-content', 'home-content'],
  }),
  banners: unstable_cache(prismaSiteContentRepository.banners, ['g1-banners'], {
    revalidate: 60,
    tags: ['site-content'],
  }),
  popups: unstable_cache(prismaSiteContentRepository.popups, ['g1-popups'], {
    revalidate: 60,
    tags: ['site-content'],
  }),
  menus: unstable_cache(prismaSiteContentRepository.menus, ['g1-menus'], {
    revalidate: 300,
    tags: ['public-shell', 'site-content'],
  }),
  testimonials: unstable_cache(prismaSiteContentRepository.testimonials, ['g1-testimonials'], {
    revalidate: 300,
    tags: ['site-content'],
  }),
  announcement: unstable_cache(prismaSiteContentRepository.announcement, ['g1-announcement'], {
    revalidate: 300,
    tags: ['public-shell'],
  }),
};
const instance = new SiteContentService(repository);
export function getSiteContentService(): SiteContentService {
  return instance;
}
export async function getSiteSettings(): Promise<Awaited<ReturnType<typeof getPublicSettings>>> {
  try {
    return await getPublicSettings();
  } catch {
    // W01 mục 8: mất kho cấu hình tạm thời không chặn lối vào đặt khám công khai.
    const defaults = defaultSettings();
    return {
      brand: { ...defaults.brand, primaryHoverColor: primaryHoverColor(defaults.brand.primaryColor) },
      contact: defaults.contact,
      seo: defaults.seo,
      maintenance: defaults.maintenance,
      legal: defaults.legal,
      booking: { holdMinutes: defaults.booking.holdMinutes },
    };
  }
}
export const getHomeSpecialties = unstable_cache(
  () => getFacilityPublicService().specialtyGroups(),
  ['g1-home-specialties'],
  { revalidate: 3600, tags: ['home-specialties'] },
);
export {
  SiteContentService,
  selectHomeBlocks,
  composeHomeBlocks,
  activeBanners,
  activePopups,
  menuTree,
} from './site-content-service';
