import { prisma } from './prisma';
import type { SiteContentRepository } from '@/lib/domain/ports';

// G1HOME / A04: chỉ chọn trường công khai; dữ liệu duyệt và thời gian được lọc tiếp sau cache.
export const prismaSiteContentRepository: SiteContentRepository = {
  blocks: () =>
    prisma.pageBlock.findMany({
      where: { page: 'HOME', status: 'PUBLISHED', active: true },
      orderBy: { sortOrder: 'asc' },
      take: 40,
      select: { id: true, page: true, type: true, data: true, sortOrder: true, active: true, status: true },
    }),
  banners: () =>
    prisma.banner.findMany({ where: { active: true }, orderBy: { sortOrder: 'asc' }, take: 100 }),
  popups: () => prisma.popup.findMany({ where: { active: true }, take: 50 }),
  menus: () =>
    prisma.menuItem.findMany({
      where: { active: true },
      orderBy: [{ location: 'asc' }, { sortOrder: 'asc' }],
      take: 200,
      select: {
        id: true,
        location: true,
        parentId: true,
        label: true,
        href: true,
        sortOrder: true,
        active: true,
      },
    }),
  testimonials: () =>
    prisma.review.findMany({
      where: { status: 'SHOWN', showOnHome: true, comment: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, rating: true, comment: true, createdAt: true },
    }),
  async announcement() {
    return (
      (await prisma.systemSetting.findUnique({ where: { key: 'announcement' }, select: { value: true } }))
        ?.value ?? null
    );
  },
};
