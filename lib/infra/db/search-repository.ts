import type { SearchRepository, SearchRows } from '@/lib/domain/search/ports';
import { prisma } from './prisma';

interface FacilityRow {
  slug: string;
  name: string;
  address: string;
  short_desc: string | null;
}

interface PostRow {
  slug: string;
  title: string;
  excerpt: string | null;
  kind: 'post' | 'guide';
}

const contains = (term: string) => `%${term}%`;

export const prismaSearchRepository: SearchRepository = {
  async facilities(term, skip, take): Promise<SearchRows> {
    const pattern = contains(term);
    // W05 mục 3: cùng biểu thức immutable_unaccent với chỉ mục GIN ở prisma/sql/extras.sql.
    // Prisma tagged query đặt tham số riêng, không ghép từ khóa vào câu SQL.
    const [rows, counts] = await Promise.all([
      prisma.$queryRaw<FacilityRow[]>`
        SELECT slug, name, address, short_desc
        FROM facility
        WHERE status <> 'INACTIVE'
          AND (immutable_unaccent(name) % ${term}
            OR immutable_unaccent(name) ILIKE ${pattern}
            OR immutable_unaccent(address) ILIKE ${pattern})
        ORDER BY CASE WHEN immutable_unaccent(name) ILIKE ${`${term}%`} THEN 0 ELSE 1 END,
          similarity(immutable_unaccent(name), ${term}) DESC, name
        LIMIT ${take} OFFSET ${skip}
      `,
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT count(*)::int AS total FROM facility
        WHERE status <> 'INACTIVE'
          AND (immutable_unaccent(name) % ${term}
            OR immutable_unaccent(name) ILIKE ${pattern}
            OR immutable_unaccent(address) ILIKE ${pattern})
      `,
    ]);
    return {
      items: rows.map((row) => ({
        type: 'facilities' as const,
        title: row.name,
        href: `/co-so/${encodeURIComponent(row.slug)}`,
        description: row.short_desc || row.address,
        context: row.address,
      })),
      total: counts[0]?.total ?? 0,
    };
  },

  async posts(term, skip, take): Promise<SearchRows> {
    const pattern = contains(term);
    const [rows, counts] = await Promise.all([
      prisma.$queryRaw<PostRow[]>`
        SELECT slug, title, excerpt, kind FROM (
          SELECT slug, title, excerpt, published_at AS published_at, 'post' AS kind FROM post
          WHERE status = 'PUBLISHED' AND (published_at IS NULL OR published_at <= now())
            AND (immutable_unaccent(title) % ${term}
              OR immutable_unaccent(title) ILIKE ${pattern}
              OR immutable_unaccent(coalesce(excerpt, '')) ILIKE ${pattern})
          UNION ALL
          SELECT slug, title, NULL::text AS excerpt, effective_at AS published_at, 'guide' AS kind
          FROM static_page
          WHERE status = 'PUBLISHED' AND effective_at <= now() AND slug LIKE 'huong-dan-%'
            AND (immutable_unaccent(title) % ${term}
              OR immutable_unaccent(title) ILIKE ${pattern})
        ) AS content
        ORDER BY CASE WHEN immutable_unaccent(title) ILIKE ${`${term}%`} THEN 0 ELSE 1 END,
          similarity(immutable_unaccent(title), ${term}) DESC, published_at DESC NULLS LAST
        LIMIT ${take} OFFSET ${skip}
      `,
      prisma.$queryRaw<Array<{ total: number }>>`
        SELECT (
          (SELECT count(*) FROM post
           WHERE status = 'PUBLISHED' AND (published_at IS NULL OR published_at <= now())
             AND (immutable_unaccent(title) % ${term}
               OR immutable_unaccent(title) ILIKE ${pattern}
               OR immutable_unaccent(coalesce(excerpt, '')) ILIKE ${pattern}))
          +
          (SELECT count(*) FROM static_page
           WHERE status = 'PUBLISHED' AND effective_at <= now() AND slug LIKE 'huong-dan-%'
             AND (immutable_unaccent(title) % ${term}
               OR immutable_unaccent(title) ILIKE ${pattern}))
        )::int AS total
      `,
    ]);
    return {
      items: rows.map((row) => ({
        type: 'posts' as const,
        title: row.title,
        href:
          row.kind === 'guide'
            ? `/huong-dan/${encodeURIComponent(row.slug.slice('huong-dan-'.length))}`
            : `/tin-tuc/${encodeURIComponent(row.slug)}`,
        ...(row.excerpt ? { description: row.excerpt } : {}),
      })),
      total: counts[0]?.total ?? 0,
    };
  },

  async log(term, results) {
    await prisma.searchLog.create({ data: { keyword: term, results } });
  },
};
