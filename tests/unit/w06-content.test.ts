import { describe, expect, it } from 'vitest';
import { ContentBlocksSchema } from '@/lib/domain/content/blocks';
import { filterFaqs } from '@/lib/domain/content/faq-search';
import type { ContentRepository, PostRow } from '@/lib/domain/content/ports';
import { ContentService } from '@/lib/services/content/content-service';

const now = new Date('2026-10-27T00:00:00Z');
const post = (slug: string, publishedAt = now): PostRow => ({
  id: slug,
  slug,
  title: slug,
  excerpt: null,
  coverUrl: null,
  contentJson: [{ type: 'paragraph', content: [{ text: 'Nội dung an toàn' }] }],
  category: { id: 'news', slug: 'tin-y-te', name: 'Tin y tế' },
  tags: [],
  specialtyTags: [],
  authorName: null,
  reviewerName: null,
  publishedAt,
  updatedAt: now,
  seoTitle: null,
  seoDesc: null,
});

function fakeRepo(rows: PostRow[]): ContentRepository {
  return {
    categories: async () => [{ id: 'news', slug: 'tin-y-te', name: 'Tin y tế' }],
    sitemapPosts: async (at) =>
      rows
        .filter((row) => row.publishedAt && row.publishedAt <= at)
        .map((row) => ({ slug: row.slug, updatedAt: row.updatedAt })),
    async listPosts({ skip, take, categorySlug, now: at }) {
      const visible = rows.filter(
        (row) =>
          row.publishedAt && row.publishedAt <= at && (!categorySlug || row.category.slug === categorySlug),
      );
      return { rows: visible.slice(skip, skip + take), total: visible.length };
    },
    postBySlug: async (slug, at) =>
      rows.find((row) => row.slug === slug && row.publishedAt && row.publishedAt <= at) ?? null,
    relatedPosts: async (source, at, take) =>
      rows.filter((row) => row.id !== source.id && row.publishedAt && row.publishedAt <= at).slice(0, take),
    pages: async () => [
      {
        slug: 'huong-dan-dat-kham',
        title: 'Đặt khám',
        contentJson: [],
        version: '1',
        effectiveAt: now,
        updatedAt: now,
      },
      { slug: 'hop-tac', title: 'Hợp tác', contentJson: [], version: '1', effectiveAt: now, updatedAt: now },
    ],
    pageBySlug: async (slug) =>
      slug === 'huong-dan-dat-kham'
        ? { slug, title: 'Đặt khám', contentJson: [], version: '1', effectiveAt: now, updatedAt: now }
        : null,
    faqs: async () => [
      {
        id: 'faq',
        groupName: 'Thanh toán',
        question: 'Hoàn tiền khi nào?',
        answer: [{ type: 'paragraph', content: [{ text: '5–7 ngày' }] }],
      },
    ],
  };
}

describe('CMS block schema – A04', () => {
  it('nhận các khối nội dung và inline mark hợp lệ', () => {
    const blocks = [
      { type: 'heading', level: 2, text: 'Đặt khám' },
      { type: 'paragraph', content: [{ text: 'Xem thêm', marks: ['bold'], href: '/huong-dan' }] },
      { type: 'image', src: '/uploads/demo.webp', alt: 'Các bước đặt khám', width: 800, height: 600 },
      { type: 'table', headers: ['Bước'], rows: [['Xác nhận']] },
    ];
    expect(ContentBlocksSchema.parse(blocks)).toHaveLength(4);
  });
  it('chặn HTML tự do và URL nguy hiểm', () => {
    expect(ContentBlocksSchema.safeParse([{ type: 'html', html: '<script>alert(1)</script>' }]).success).toBe(
      false,
    );
    expect(
      ContentBlocksSchema.safeParse([{ type: 'button', label: 'Mở', href: 'javascript:alert(1)' }]).success,
    ).toBe(false);
    expect(
      ContentBlocksSchema.safeParse([
        { type: 'image', src: '//evil.test/a.png', alt: 'ảnh', width: 1, height: 1 },
      ]).success,
    ).toBe(false);
    expect(
      ContentBlocksSchema.safeParse([{ type: 'button', label: 'Mở', href: '/\\evil.test' }]).success,
    ).toBe(false);
  });
});

describe('ContentService', () => {
  it('phân trang, lọc chuyên mục và ẩn bài hẹn giờ chưa đến hạn', async () => {
    const service = new ContentService(
      fakeRepo([post('a'), post('b'), post('future', new Date('2026-10-28T00:00:00Z'))]),
      () => now,
    );
    const first = await service.posts(1, 1, 'tin-y-te');
    expect(first).toMatchObject({ page: 1, pageSize: 1, total: 2 });
    expect(first.items[0]?.slug).toBe('a');
    expect((await service.posts(2, 1)).items[0]?.slug).toBe('b');
    expect(await service.postBySlug('future')).toBeNull();
  });
  it('trả bài liên quan, hướng dẫn và FAQ đã kiểm JSON', async () => {
    const service = new ContentService(fakeRepo([post('a'), post('b')]), () => now);
    const article = await service.postBySlug('a');
    expect(article?.blocks[0]?.type).toBe('paragraph');
    expect((await service.related(article!))[0]?.slug).toBe('b');
    expect((await service.guidePages()).map((page) => page.slug)).toEqual(['huong-dan-dat-kham']);
    expect((await service.faqs())[0]?.question).toContain('Hoàn tiền');
    expect(filterFaqs(await service.faqs(), 'hoan tien')).toHaveLength(1);
    expect(filterFaqs(await service.faqs(), 'khong co')).toHaveLength(0);
  });
  it('không render JSON CMS sai schema', async () => {
    const bad = post('bad');
    bad.contentJson = [{ type: 'paragraph', content: [{ text: 'x', href: 'javascript:alert(1)' }] }];
    const service = new ContentService(fakeRepo([bad]), () => now);
    await expect(service.postBySlug('bad')).rejects.toMatchObject({ code: 'CONTENT_INVALID' });
    bad.contentJson = [];
    bad.coverUrl = 'javascript:alert(1)';
    await expect(service.postBySlug('bad')).rejects.toMatchObject({ code: 'CONTENT_INVALID' });
  });
  it('sitemap chỉ gồm bài đã tới giờ đăng', async () => {
    const service = new ContentService(
      fakeRepo([post('a'), post('future', new Date('2026-10-28T00:00:00Z'))]),
      () => now,
    );
    expect((await service.sitemapPosts()).map((item) => item.slug)).toEqual(['a']);
  });
});
