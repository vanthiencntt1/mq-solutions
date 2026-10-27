import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CategoryRow } from '@/lib/domain/content/ports';
import type { PublicPost } from '@/lib/domain/content/types';
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
    <div className="container-page py-10 md:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">
          Góc thông tin MQ Solutions
        </p>
        <h1 className="text-[32px] leading-tight md:text-[50px]">{title}</h1>
        <p className="text-slate-gray mt-4 text-[18px] leading-7">{description}</p>
      </header>
      <nav aria-label="Chuyên mục tin tức" className="mb-8 flex flex-wrap gap-2">
        <Link
          href="/tin-tuc"
          aria-current={!categorySlug ? 'page' : undefined}
          className={`text-body-sm rounded-full border px-4 py-2 font-semibold ${!categorySlug ? 'border-deep-cobalt bg-info-bg text-deep-cobalt' : 'border-hairline bg-paper'}`}
        >
          Tất cả
        </Link>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={`/tin-tuc/${category.slug}`}
            aria-current={category.slug === categorySlug ? 'page' : undefined}
            className={`text-body-sm rounded-full border px-4 py-2 font-semibold ${category.slug === categorySlug ? 'border-deep-cobalt bg-info-bg text-deep-cobalt' : 'border-hairline bg-paper'}`}
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
        <p className="border-hairline bg-paper rounded-xl border p-8 text-center">
          Chưa có bài viết trong chuyên mục này.
        </p>
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
                className="border-hairline bg-paper inline-flex items-center gap-1 rounded-lg border px-4 py-2"
              >
                <ArrowLeft className="size-4" aria-hidden /> Trước
              </Link>
            )}
            {page < pages && (
              <Link
                rel="next"
                href={`${base}?page=${page + 1}`}
                className="border-hairline bg-paper inline-flex items-center gap-1 rounded-lg border px-4 py-2"
              >
                Tiếp <ArrowRight className="size-4" aria-hidden />
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
