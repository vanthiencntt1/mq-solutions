import type { MetadataRoute } from 'next';
import { getSeoService } from '@/lib/services/privacy/seo-index';

export const dynamic = 'force-dynamic';

const STATIC_PATHS = [
  '/',
  '/co-so-y-te',
  '/chuyen-khoa',
  '/bac-si',
  '/tin-tuc',
  '/huong-dan',
  '/hop-tac',
] as const;

// W09 mục 4: dùng slug cơ sở ACTIVE và nội dung đã xuất bản, không lập chỉ mục trang riêng tư.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const rows = await getSeoService().listSitemapRows();
  return [
    ...STATIC_PATHS.map((path) => ({
      url: new URL(path, base).toString(),
      changeFrequency: 'weekly' as const,
      priority: path === '/' ? 1 : 0.7,
    })),
    ...rows.map((item) => ({
      url: new URL(item.path, base).toString(),
      lastModified: item.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ];
}
