import { describe, expect, it } from 'vitest';
import type { SiteContentRepository } from '@/lib/domain/ports';
import {
  activeBanners,
  activePopups,
  composeHomeBlocks,
  menuTree,
  selectHomeBlocks,
  SiteContentService,
} from '@/lib/services/site-content/site-content-service';

const now = new Date('2026-10-27T03:00:00.000Z');
const banner = {
  id: 'banner-1',
  placement: 'HOME',
  imageUrl: '/uploads/banner.webp',
  imageMobileUrl: null,
  title: null,
  link: '/co-so-y-te',
  startAt: null,
  endAt: null,
  sortOrder: 2,
  active: true,
};

describe('G1HOME nội dung công khai', () => {
  it('lọc banner đúng vị trí, trạng thái và khoảng thời gian', () => {
    const rows = [
      { ...banner, id: 'future', startAt: new Date('2026-10-28T00:00:00Z') },
      { ...banner, id: 'expired', endAt: now },
      { ...banner, id: 'other', placement: 'FACILITY' },
      { ...banner, id: 'inactive', active: false },
      { ...banner, id: 'first', sortOrder: 1, startAt: new Date('2026-10-26T00:00:00Z') },
      banner,
    ];
    expect(activeBanners(rows, 'HOME', now).map((row) => row.id)).toEqual(['first', 'banner-1']);
  });

  it('chỉ chọn khối HOME đã xuất bản và biết cách render', () => {
    const common = { page: 'HOME', active: true, status: 'PUBLISHED', data: {}, sortOrder: 2 };
    const rows = [
      { ...common, id: 'news', type: 'NEWS' },
      { ...common, id: 'hero', type: 'HERO', sortOrder: 1, data: { title: 'Đặt khám' } },
      { ...common, id: 'draft', type: 'STATS', status: 'DRAFT' },
      { ...common, id: 'hidden', type: 'SERVICES', active: false },
      { ...common, id: 'unknown', type: 'UNKNOWN' },
      { ...common, id: 'other', page: 'FACILITY', type: 'BANNER' },
      {
        ...common,
        id: 'content',
        type: 'CONTENT',
        data: [{ type: 'heading', level: 2, text: 'Giới thiệu' }],
        sortOrder: 3,
      },
    ];
    expect(selectHomeBlocks(rows).map((row) => row.id)).toEqual(['hero', 'news', 'content']);
  });

  it('giữ bố cục mặc định khi admin mới chỉ có khối CONTENT', () => {
    const content = { id: 'c', type: 'CONTENT' as const, sortOrder: 1, data: [] };
    expect(composeHomeBlocks([content], ['HERO', 'SERVICES']).map((block) => block.type)).toEqual([
      'HERO',
      'SERVICES',
      'CONTENT',
    ]);
    const hero = { id: 'h', type: 'HERO' as const, sortOrder: 0, data: {} };
    expect(composeHomeBlocks([hero], ['HERO', 'SERVICES'])).toEqual([hero]);
  });

  it('dựng menu cha con theo thứ tự và dùng menu mặc định khi DB trống', () => {
    const row = { location: 'HEADER', sortOrder: 2, active: true };
    const rows = [
      { ...row, id: 'parent', parentId: null, label: 'Cơ sở', href: '/co-so-y-te' },
      {
        ...row,
        id: 'child',
        parentId: 'parent',
        label: 'Bệnh viện',
        href: '/co-so-y-te/benh-vien',
        sortOrder: 1,
      },
      { ...row, id: 'unsafe', parentId: null, label: 'Lạ', href: '//evil.test' },
      { ...row, id: 'hidden', parentId: null, label: 'Ẩn', href: '/an', active: false },
    ];
    const fallback = [{ href: '/', label: 'Trang chủ' }];
    expect(menuTree(rows, 'HEADER', fallback)).toEqual([
      {
        href: '/co-so-y-te',
        label: 'Cơ sở',
        children: [{ href: '/co-so-y-te/benh-vien', label: 'Bệnh viện' }],
      },
    ]);
    expect(menuTree([], 'HEADER', fallback)).toEqual(fallback);
  });

  it('lọc popup theo trang và giữ fallback cấu hình shell', async () => {
    const popup = {
      id: 'popup-1',
      imageUrl: '/uploads/popup.webp',
      link: null,
      pages: ['/'],
      frequency: 'ONCE_DAY',
      startAt: null,
      endAt: null,
      active: true,
    };
    expect(
      activePopups([popup, { ...popup, id: 'ended', endAt: now }], '/', now).map((item) => item.id),
    ).toEqual(['popup-1']);
    expect(activePopups([popup], '/tin-tuc', now)).toEqual([]);
    const repo: SiteContentRepository = {
      blocks: async () => [],
      banners: async () => [],
      popups: async () => [],
      menus: async () => [],
      testimonials: async () => [],
      announcement: async () => null,
    };
    const settings = {
      brand: { name: 'MQ Y tế', logoDark: '' },
      contact: {
        hotline: '1900 1234',
        email: 'help@example.com',
        address: 'TP.HCM',
        taxCode: '',
        facebook: '',
        zalo: '',
        youtube: '',
        tiktok: '',
      },
      legal: { termsVersion: '2', privacyVersion: '3' },
    };
    const shell = await new SiteContentService(repo, () => now).shell(settings);
    expect(shell.hotline).toBe('1900 1234');
    expect(shell.mainNav.length).toBeGreaterThan(0);
    expect(shell.footerColumns.length).toBe(3);
    expect(shell.termsVersion).toBe('2');
    const partial = await new SiteContentService(
      {
        ...repo,
        menus: async () => {
          throw new Error('DB menu unavailable');
        },
      },
      () => now,
    ).shell(settings);
    expect(partial.hotline).toBe('1900 1234');
    expect(partial.mainNav.length).toBeGreaterThan(0);
  });
});
