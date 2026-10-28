'use client';

import { usePathname } from 'next/navigation';
import { AccountNav } from './account-nav';

export function AccountLayoutFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const wide = /^\/tai-khoan\/co-so\/[^/]+(?:\/|$)/.test(pathname);
  if (wide)
    return (
      <main id="noi-dung" className="bg-cloud min-h-[calc(100dvh-72px)] min-w-0 px-4 py-4 md:px-6 xl:px-8">
        {children}
      </main>
    );
  return (
    <div className="container-page grid min-w-0 gap-8 py-8 md:grid-cols-[240px_minmax(0,1fr)] md:py-12">
      <AccountNav />
      <main id="noi-dung" className="min-w-0">
        {children}
      </main>
    </div>
  );
}
