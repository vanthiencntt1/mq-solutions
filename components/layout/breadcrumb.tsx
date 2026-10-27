import Link from 'next/link';
import { ChevronRight, House } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({
  items,
  baseUrl = 'http://localhost:3000',
}: {
  items: BreadcrumbItem[];
  baseUrl?: string;
}) {
  const trail: BreadcrumbItem[] = [{ label: 'Trang chủ', href: '/' }, ...items];
  const structuredData = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: new URL(item.href, baseUrl).toString() } : {}),
    })),
  }).replace(/</g, '\\u003c');

  return (
    <>
      <nav aria-label="Đường dẫn trang" className="text-body-sm text-slate-gray py-4">
        <ol className="flex min-h-8 flex-wrap items-center gap-2">
          {trail.map((item, index) => (
            <li key={`${item.href ?? item.label}-${index}`} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="text-mist-gray size-4" aria-hidden />}
              {item.href && index < trail.length - 1 ? (
                <Link
                  href={item.href}
                  className="text-slate-gray hover:text-primary inline-flex min-h-11 items-center gap-1 rounded-md hover:underline"
                >
                  {index === 0 && <House className="size-4 stroke-[1.75]" aria-hidden />}
                  {item.label}
                </Link>
              ) : (
                <span className="text-ink-navy font-semibold" aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      {/* W01 mục 7: ký tự '<' được escape trước khi đưa dữ liệu đường dẫn vào JSON-LD. */}
      <script type="application/ld+json">{structuredData}</script>
    </>
  );
}
