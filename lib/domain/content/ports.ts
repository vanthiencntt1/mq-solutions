export interface CategoryRow {
  id: string;
  slug: string;
  name: string;
}
export interface PostRow {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  coverUrl: string | null;
  contentJson: unknown;
  category: CategoryRow;
  tags: string[];
  specialtyTags: string[];
  authorName: string | null;
  reviewerName: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  seoTitle: string | null;
  seoDesc: string | null;
}
export interface PageRow {
  slug: string;
  title: string;
  contentJson: unknown;
  version: string;
  effectiveAt: Date;
  updatedAt: Date;
}
export interface FaqRow {
  id: string;
  groupName: string;
  question: string;
  answer: unknown;
}
export interface ContentRepository {
  categories(): Promise<CategoryRow[]>;
  sitemapPosts(now: Date): Promise<{ slug: string; updatedAt: Date }[]>;
  listPosts(query: {
    skip: number;
    take: number;
    categorySlug?: string;
    now: Date;
  }): Promise<{ rows: PostRow[]; total: number }>;
  postBySlug(slug: string, now: Date): Promise<PostRow | null>;
  relatedPosts(post: Pick<PostRow, 'id' | 'category' | 'tags'>, now: Date, take: number): Promise<PostRow[]>;
  pages(): Promise<PageRow[]>;
  pageBySlug(slug: string): Promise<PageRow | null>;
  faqs(): Promise<FaqRow[]>;
}
