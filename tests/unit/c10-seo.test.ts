import { describe, expect, it } from 'vitest';
import { SeoService } from '@/lib/services/privacy/seo-service';

describe('W09 sitemap', () => {
  it('đặt slug đã công khai vào đúng đường dẫn cơ sở, tin tức, hướng dẫn và chính sách', async () => {
    const updatedAt = new Date('2026-10-27T00:00:00Z');
    const service = new SeoService({
      listFacilities: async () => [{ slug: 'benh-vien-mau', updatedAt }],
      listPosts: async () => [{ slug: 'bai-viet-mau', updatedAt }],
      listPages: async () => [
        { slug: 'huong-dan-dat-lich-kham', updatedAt },
        { slug: 'chinh-sach-bao-mat', updatedAt },
      ],
    });
    expect((await service.listSitemapRows()).map((row) => row.path)).toEqual([
      '/co-so/benh-vien-mau',
      '/tin-tuc/bai-viet-mau',
      '/huong-dan/dat-lich-kham',
      '/chinh-sach/chinh-sach-bao-mat',
    ]);
  });
});
