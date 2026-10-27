import Link from 'next/link';
import { ArrowRight, Newspaper } from 'lucide-react';

export interface HomeNewsItem {
  slug: string;
  title: string;
  excerpt?: string | null;
}

export function RecentNews({ items = [] }: { items?: HomeNewsItem[] }) {
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="news-title">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-info mb-2 text-sm font-semibold">CẬP NHẬT</p>
          <h2 id="news-title" className="text-[26px] md:text-[38px]">
            Tin tức mới
          </h2>
        </div>
        <Link
          href="/tin-tuc"
          className="text-ink-navy inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
        >
          Xem tin tức <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {items.length ? (
        <div className="grid gap-4 md:grid-cols-3">
          {items.slice(0, 6).map((item) => (
            <article key={item.slug} className="border-border bg-card rounded-xl border p-6 shadow-sm">
              <Newspaper className="text-primary mb-4 size-6" aria-hidden />
              <h3 className="text-ink-navy text-[20px] font-semibold">
                <Link href={`/tin-tuc/${item.slug}`} className="hover:underline">
                  {item.title}
                </Link>
              </h3>
              {item.excerpt && <p className="text-slate-gray mt-2 line-clamp-3 text-sm">{item.excerpt}</p>}
            </article>
          ))}
        </div>
      ) : (
        <div className="border-border bg-card text-slate-gray flex items-center gap-3 rounded-xl border p-6 text-sm">
          <Newspaper className="size-5 shrink-0" aria-hidden />
          Tin tức sẽ được cập nhật tại đây.
        </div>
      )}
    </section>
  );
}
