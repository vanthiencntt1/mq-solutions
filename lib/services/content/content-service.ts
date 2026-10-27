import { AppError } from '@/lib/domain/errors';
import { ContentBlocksSchema, ContentUrlSchema, type ContentBlocks } from '@/lib/domain/content/blocks';
import type { ContentRepository, PageRow, PostRow } from '@/lib/domain/content/ports';
import type { PublicFaq, PublicPage, PublicPost } from '@/lib/domain/content/types';

// W06/W07: DB là nguồn dữ liệu biên tập; luôn kiểm JSON lúc đọc để nội dung sai không vào renderer.
export class ContentService {
  constructor(
    private readonly repo: ContentRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private blocks(raw: unknown): ContentBlocks {
    const parsed = ContentBlocksSchema.safeParse(raw);
    if (!parsed.success) throw new AppError('CONTENT_INVALID');
    return parsed.data;
  }

  private post(row: PostRow): PublicPost {
    const { contentJson, ...rest } = row;
    if (rest.coverUrl && !ContentUrlSchema.safeParse(rest.coverUrl).success)
      throw new AppError('CONTENT_INVALID');
    return { ...rest, blocks: this.blocks(contentJson) };
  }

  async categories() {
    return this.repo.categories();
  }

  async sitemapPosts() {
    return this.repo.sitemapPosts(this.now());
  }

  async posts(page = 1, pageSize = 9, categorySlug?: string) {
    const safePage = Math.max(1, Math.floor(page));
    const safeSize = Math.min(100, Math.max(1, Math.floor(pageSize)));
    const result = await this.repo.listPosts({
      skip: (safePage - 1) * safeSize,
      take: safeSize,
      categorySlug,
      now: this.now(),
    });
    return {
      items: result.rows.map((row) => this.post(row)),
      page: safePage,
      pageSize: safeSize,
      total: result.total,
    };
  }

  async postBySlug(slug: string) {
    const row = await this.repo.postBySlug(slug, this.now());
    return row ? this.post(row) : null;
  }

  async related(post: PublicPost, take = 3) {
    return (await this.repo.relatedPosts(post, this.now(), Math.min(take, 6))).map((row) => this.post(row));
  }

  async guidePages() {
    const rows = await this.repo.pages();
    return rows.filter((row) => row.slug.startsWith('huong-dan-')).map((row) => this.page(row));
  }

  async guide(slug: string) {
    return this.pageBySlug(`huong-dan-${slug}`);
  }

  async pageBySlug(slug: string) {
    const row = await this.repo.pageBySlug(slug);
    return row ? this.page(row) : null;
  }

  private page(row: PageRow): PublicPage {
    const { contentJson, ...rest } = row;
    return { ...rest, blocks: this.blocks(contentJson) };
  }

  async faqs(): Promise<PublicFaq[]> {
    return (await this.repo.faqs()).map(({ answer, ...rest }) => ({ ...rest, blocks: this.blocks(answer) }));
  }
}
