export interface SitemapRow {
  path: string;
  updatedAt: Date;
}

export interface SeoRepository {
  listFacilities(): Promise<{ slug: string; updatedAt: Date }[]>;
  listPosts(): Promise<{ slug: string; updatedAt: Date }[]>;
  listPages(): Promise<{ slug: string; updatedAt: Date }[]>;
}

// W09 mục 4: DB chỉ cấp slug của nội dung đã công khai; không đưa dữ liệu tài khoản vào sitemap.
export class SeoService {
  constructor(private readonly repository: SeoRepository) {}

  async listSitemapRows(): Promise<SitemapRow[]> {
    const [facilities, posts, pages] = await Promise.all([
      this.repository.listFacilities(),
      this.repository.listPosts(),
      this.repository.listPages(),
    ]);
    return [
      ...facilities.map((item) => ({
        path: `/co-so/${encodeURIComponent(item.slug)}`,
        updatedAt: item.updatedAt,
      })),
      ...posts.map((item) => ({
        path: `/tin-tuc/${encodeURIComponent(item.slug)}`,
        updatedAt: item.updatedAt,
      })),
      ...pages.map((item) => ({
        path: item.slug.startsWith('huong-dan-')
          ? `/huong-dan/${encodeURIComponent(item.slug.slice('huong-dan-'.length))}`
          : `/chinh-sach/${encodeURIComponent(item.slug)}`,
        updatedAt: item.updatedAt,
      })),
    ];
  }
}
