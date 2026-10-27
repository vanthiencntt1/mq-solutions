import type { ContentRepository } from '@/lib/domain/content/ports';
import { prisma } from './prisma';

const postSelect = {
  id: true,
  slug: true,
  title: true,
  excerpt: true,
  coverUrl: true,
  contentJson: true,
  category: { select: { id: true, slug: true, name: true } },
  tags: true,
  specialtyTags: true,
  authorName: true,
  reviewerName: true,
  publishedAt: true,
  updatedAt: true,
  seoTitle: true,
  seoDesc: true,
} as const;
const pageSelect = {
  slug: true,
  title: true,
  contentJson: true,
  version: true,
  effectiveAt: true,
  updatedAt: true,
} as const;

// W06 mục 2: SCHEDULED tự hiện sau publishedAt, không cần job chuyển trạng thái.
const visiblePost = (now: Date) => ({
  status: { in: ['PUBLISHED', 'SCHEDULED'] as ('PUBLISHED' | 'SCHEDULED')[] },
  publishedAt: { lte: now },
});

export const prismaContentRepository: ContentRepository = {
  sitemapPosts(now) {
    return prisma.post.findMany({
      where: visiblePost(now),
      select: { slug: true, updatedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 50000,
    });
  },
  async categories() {
    return prisma.postCategory.findMany({
      where: { posts: { some: visiblePost(new Date()) } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 100,
      select: { id: true, slug: true, name: true },
    });
  },
  async listPosts({ skip, take, categorySlug, now }) {
    const where = { ...visiblePost(now), ...(categorySlug ? { category: { slug: categorySlug } } : {}) };
    const [rows, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
        select: postSelect,
      }),
      prisma.post.count({ where }),
    ]);
    return { rows, total };
  },
  postBySlug(slug, now) {
    return prisma.post.findFirst({ where: { slug, ...visiblePost(now) }, select: postSelect });
  },
  relatedPosts(post, now, take) {
    return prisma.post.findMany({
      where: {
        id: { not: post.id },
        ...visiblePost(now),
        OR: [
          { categoryId: post.category.id },
          ...(post.tags.length ? [{ tags: { hasSome: post.tags } }] : []),
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take,
      select: postSelect,
    });
  },
  pages() {
    return prisma.staticPage.findMany({
      where: { status: 'PUBLISHED', slug: { startsWith: 'huong-dan-' } },
      orderBy: { title: 'asc' },
      take: 200,
      select: pageSelect,
    });
  },
  pageBySlug(slug) {
    return prisma.staticPage.findFirst({ where: { slug, status: 'PUBLISHED' }, select: pageSelect });
  },
  faqs() {
    return prisma.faqItem.findMany({
      where: { active: true },
      orderBy: [{ groupName: 'asc' }, { sortOrder: 'asc' }],
      take: 500,
      select: { id: true, groupName: true, question: true, answer: true },
    });
  },
};
