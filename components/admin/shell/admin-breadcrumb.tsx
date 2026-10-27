'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ADMIN_NAV } from '@/lib/config/site';

export function AdminBreadcrumb() {
  const pathname = usePathname();
  const [pageTitle, setPageTitle] = useState('');
  useEffect(() => {
    setPageTitle(document.querySelector('main h1')?.textContent?.trim() ?? '');
  }, [pathname]);
  if (pathname === '/admin') return <span className="text-ink-navy truncate text-sm font-semibold">Tổng quan</span>;
  const item = ADMIN_NAV.filter((nav) => pathname === nav.href || pathname.startsWith(`${nav.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const trail = item ? [{ label: item.label, href: item.href }] : [];
  if (!item || pathname !== item.href) {
    const last = pathname.split('/').filter(Boolean).at(-1) ?? '';
    trail.push({ label: pageTitle || decodeURIComponent(last).replaceAll('-', ' '), href: pathname });
  }
  return <nav aria-label="Đường dẫn quản trị" className="min-w-0 text-sm">
    <ol className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
      <li className="hidden sm:block"><Link href="/admin" className="text-slate-gray hover:text-primary">Tổng quan</Link></li>
      {trail.map((entry, index) => <li key={entry.href} className="flex min-w-0 items-center gap-1.5">
        <ChevronRight size={14} className="text-mist-gray hidden shrink-0 sm:block" aria-hidden />
        {index < trail.length - 1 ? <Link href={entry.href} className="text-slate-gray hover:text-primary truncate">{entry.label}</Link>
          : <span aria-current="page" className="text-ink-navy truncate font-semibold">{entry.label}</span>}
      </li>)}
    </ol>
  </nav>;
}
