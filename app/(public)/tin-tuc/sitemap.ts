import type { MetadataRoute } from 'next';
import { getContentService } from '@/lib/services/content';

export const revalidate = 60;

// W06 mục 4: chỉ xuất bài đã công khai; URL của trang chuyên mục nằm ở sitemap chính khi A04 nối menu.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const posts = await getContentService().sitemapPosts();
  return posts.map((post) => ({
    url: new URL(`/tin-tuc/${post.slug}`, base).toString(),
    lastModified: post.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));
}
