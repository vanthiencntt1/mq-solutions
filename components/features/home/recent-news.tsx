import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Newspaper } from 'lucide-react';
import { IconTile } from '@/components/ui/icon-tile';
import type { SectionData } from './home-sections';

export interface HomeNewsItem {
  slug: string;
  title: string;
  excerpt?: string | null;
  coverUrl?: string | null;
}

export function RecentNews({ items = [], data = {} }: { items?: HomeNewsItem[]; data?: SectionData }) {
  if (!items.length) return null;
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="news-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="news-title" className="section-title">
            {data.title || 'Tin tức mới'}
          </h2>
          {data.description && <p className="text-slate-gray mt-3">{data.description}</p>}
        </div>
        <Link
          href="/tin-tuc"
          className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
        >
          Xem tin tức <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {items.slice(0, 3).map((item) => (
          <article
            key={item.slug}
            className="border-hairline bg-card overflow-hidden rounded-xl border shadow-sm"
          >
            {item.coverUrl ? (
              <Link href={`/tin-tuc/${item.slug}`} className="block">
                <Image
                  src={item.coverUrl}
                  alt={`Ảnh bìa: ${item.title}`}
                  width={600}
                  height={380}
                  unoptimized
                  className="aspect-[16/10] w-full object-cover"
                />
              </Link>
            ) : (
              <div className="bg-pebble flex aspect-[16/10] items-center justify-center">
                <IconTile size="lg">
                  <Newspaper aria-hidden />
                </IconTile>
              </div>
            )}
            <div className="p-5">
              <h3 className="text-ink-navy text-[22px] leading-snug font-bold">
                <Link href={`/tin-tuc/${item.slug}`} className="hover:text-primary">
                  {item.title}
                </Link>
              </h3>
              {item.excerpt && (
                <p className="text-slate-gray mt-3 line-clamp-3 text-sm leading-relaxed">{item.excerpt}</p>
              )}
              <Link
                href={`/tin-tuc/${item.slug}`}
                className="text-primary mt-4 inline-flex min-h-11 items-center gap-1 font-semibold"
              >
                Đọc bài viết <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
