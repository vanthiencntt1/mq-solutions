import Link from 'next/link';
import type { PublicPage } from '@/lib/domain/content/types';

export function GuideNav({ pages, current }: { pages: PublicPage[]; current?: string }) {
  return (
    <nav aria-label="Các mục hướng dẫn" className="border-hairline bg-paper rounded-xl border p-4 shadow-sm">
      <h2 className="mb-3 text-[18px]">Nội dung hướng dẫn</h2>
      <ul className="space-y-1">
        {pages.map((page) => {
          const slug = page.slug.replace(/^huong-dan-/, '');
          return (
            <li key={page.slug}>
              <Link
                href={`/huong-dan/${slug}`}
                aria-current={slug === current ? 'page' : undefined}
                className={`text-body-sm block rounded-lg px-3 py-2 ${slug === current ? 'bg-info-bg text-deep-cobalt font-semibold' : 'hover:bg-pebble'}`}
              >
                {page.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
