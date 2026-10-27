import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { PublicPost } from '@/lib/domain/content/types';
import { formatDate } from '@/lib/utils/format';

export function PostCard({ post, featured = false }: { post: PublicPost; featured?: boolean }) {
  return (
    <article
      className={`border-hairline bg-paper overflow-hidden rounded-xl border shadow-sm ${featured ? 'md:grid md:grid-cols-2' : ''}`}
    >
      {post.coverUrl && (
        <Link href={`/tin-tuc/${post.slug}`} className="block overflow-hidden">
          <Image
            src={post.coverUrl}
            alt={`Ảnh bìa: ${post.title}`}
            width={900}
            height={600}
            unoptimized
            className={`w-full rounded-xl object-cover ${featured ? 'h-full max-h-[420px]' : 'aspect-[16/10]'}`}
          />
        </Link>
      )}
      <div className="flex flex-col gap-3 p-5 md:p-6">
        <p className="text-body-sm text-deep-cobalt font-semibold">
          {post.category.name} · {post.publishedAt && formatDate(post.publishedAt)}
        </p>
        <h2 className={featured ? 'text-[38px] leading-tight md:text-[42px]' : 'text-[24px] leading-snug'}>
          <Link href={`/tin-tuc/${post.slug}`} className="hover:text-deep-cobalt">
            {post.title}
          </Link>
        </h2>
        {post.excerpt && <p className="text-slate-gray line-clamp-3 leading-7">{post.excerpt}</p>}
        <Link
          href={`/tin-tuc/${post.slug}`}
          className="text-primary mt-auto inline-flex min-h-11 items-center gap-1 pt-3 font-semibold"
        >
          Đọc bài viết <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}
