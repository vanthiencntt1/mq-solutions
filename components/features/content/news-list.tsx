import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CategoryRow } from '@/lib/domain/content/ports';
import type { PublicPost } from '@/lib/domain/content/types';
import { EmptyState } from '@/components/ui/empty-state';
import { PostCard } from './post-card';

export function NewsList({
  title,
  description,
  posts,
  categories,
  page,
  pageSize,
  total,
  categorySlug,
}: {
  title: string;
  description: string;
  posts: PublicPost[];
  categories: CategoryRow[];
  page: number;
  pageSize: number;
  total: number;
  categorySlug?: string;
}) {
  const base = categorySlug ? `/tin-tuc/${categorySlug}` : '/tin-tuc';
  const pages = Math.ceil(total / pageSize);
  return (
    <main className="container-page py-12 md:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">
          Góc thông tin MQ Solutions
        </p>
        <h1 className="text-display-responsive">{title}</h1>
        <p className="text-slate-gray mt-4 text-[18px] leading-7">{description}</p>
      </header>
      <nav aria-label="Chuyên mục tin tức" className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/tin-tuc"
          aria-current={!categorySlug ? 'page' : undefined}
          className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold ${!categorySlug ? 'border-primary bg-info-bg text-primary' : 'border-hairline bg-paper text-ink-navy'}`}
        >
          Tất cả
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/tin-tuc/${category.slug}`}
            aria-current={category.slug === categorySlug ? 'page' : undefined}
            className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-semibold ${category.slug === categorySlug ? 'border-primary bg-info-bg text-primary' : 'border-hairline bg-paper text-ink-navy'}`}
          >
            {category.name}
          </Link>
        ))}
      </nav>
      {posts.length > 0 ? (
        <>
          <div className="mb-6">
            <PostCard post={posts[0]!} featured />
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.slice(1).map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="Chưa có bài viết"
          description="Bạn có thể xem các chuyên mục khác hoặc quay lại sau."
        />
      )}
      {pages > 1 && (
        <nav aria-label="Phân trang tin tức" className="mt-10 flex items-center justify-between gap-3">
          <span className="text-body-sm text-slate-gray">
            Trang {page} / {pages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                rel="prev"
                href={`${base}?page=${page - 1}`}
                className="border-hairline bg-paper inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 py-2"
              >
                <ArrowLeft className="size-4" aria-hidden /> Trước
              </Link>
            )}
            {page < pages && (
              <Link
                rel="next"
                href={`${base}?page=${page + 1}`}
                className="border-hairline bg-paper inline-flex min-h-11 items-center gap-1 rounded-lg border px-4 py-2"
              >
                Tiếp <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </nav>
      )}
    </main>
  );
}
