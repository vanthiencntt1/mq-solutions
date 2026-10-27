import Link from 'next/link';
import type { PublicPage } from '@/lib/domain/content/types';

export function GuideNav({ pages, current }: { pages: PublicPage[]; current?: string }) {
  return (
    <nav
      aria-label="Các mục hướng dẫn"
      className="border-hairline bg-paper h-fit rounded-2xl border p-5 shadow-sm lg:sticky lg:top-24"
    >
      <p className="text-ink-navy mb-3 text-xl font-bold">Nội dung hướng dẫn</p>
      <ul className="space-y-1">
        {pages.map((page) => {
          const slug = page.slug.replace(/^huong-dan-/, '');
          return (
            <li key={page.slug}>
              <Link
                href={`/huong-dan/${slug}`}
                aria-current={slug === current ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm ${slug === current ? 'bg-info-bg text-primary font-semibold' : 'text-ink-navy hover:bg-pebble'}`}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href="/huong-dan/cau-hoi-thuong-gap"
            aria-current={current === 'cau-hoi-thuong-gap' ? 'page' : undefined}
            className={`flex min-h-11 items-center rounded-lg px-3 py-2 text-sm ${current === 'cau-hoi-thuong-gap' ? 'bg-info-bg text-primary font-semibold' : 'text-ink-navy hover:bg-pebble'}`}
          >
            Câu hỏi thường gặp
          </Link>
        </li>
      </ul>
    </nav>
  );
}
