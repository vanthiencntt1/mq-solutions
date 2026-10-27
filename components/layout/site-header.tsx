'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowRight, ChevronDown, Menu, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HeaderAuth } from '@/components/features/auth/session-buttons';
import { Button } from '@/components/ui/button';
import { MAIN_NAV, SITE, type NavItem, type PublicShell } from '@/lib/config/site';
import { Logo } from './logo';

export function SiteHeader({ shell }: { shell?: PublicShell }) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const nav = shell?.mainNav ?? MAIN_NAV;
  const hotline = shell?.hotline ?? SITE.hotline;
  const socials = [
    { label: 'Facebook', href: shell?.facebookUrl },
    { label: 'Zalo', href: shell?.zaloUrl },
    { label: 'YouTube', href: shell?.youtubeUrl },
    { label: 'TikTok', href: shell?.tiktokUrl },
  ].filter((item) => item.href);

  useEffect(() => {
    // W01 mục 2: header gọn lại sau 80 px cuộn.
    const onScroll = () => setCompact(window.scrollY > 80);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
      if (event.key === 'Tab') {
        const focusable = dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const isCurrent = (item: NavItem) => pathname === item.href || pathname.startsWith(`${item.href}/`);

  return (
    <header className="border-border bg-card/95 sticky top-0 z-40 border-b">
      <div className="bg-cloud text-slate-gray hidden px-6 py-1.5 text-right text-xs lg:block">
        <div className="container-page flex items-center justify-end gap-5">
          <span>
            Hỗ trợ đặt khám:{' '}
            <a
              className="text-ink-navy font-semibold hover:underline"
              href={`tel:${hotline.replace(/\s/g, '')}`}
            >
              {hotline}
            </a>
          </span>
          {socials.map((item) => (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink-navy hover:underline"
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
      {shell?.announcement && (
        <div className="bg-info-bg text-ink-navy border-border border-b px-4 py-2 text-center text-sm">
          {shell.announcement.href ? (
            <Link
              className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
              href={shell.announcement.href}
            >
              {shell.announcement.text} <ArrowRight className="size-4" aria-hidden />
            </Link>
          ) : (
            <span>{shell.announcement.text}</span>
          )}
        </div>
      )}
      <div
        className={`container-page flex items-center justify-between gap-4 transition-[height] duration-200 ${compact ? 'h-14' : 'h-16'}`}
      >
        <Logo name={shell?.name} logoUrl={shell?.logoUrl} />
        <nav aria-label="Menu chính" className="relative hidden lg:block">
          <ul className="flex items-center gap-5 text-sm font-medium xl:gap-6">
            {nav.map((item) => (
              <li key={`${item.href}:${item.label}`}>
                {item.children?.length ? (
                  <details className="group">
                    <summary className="text-ink-navy hover:text-primary flex min-h-11 cursor-pointer list-none items-center gap-1 rounded-md px-1 focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
                      {item.label}{' '}
                      <ChevronDown
                        className="size-4 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </summary>
                    <ul className="border-border bg-card absolute top-full left-1/2 z-40 mt-1 grid w-[min(680px,calc(100vw-48px))] -translate-x-1/2 grid-cols-2 gap-1 rounded-2xl border p-4 shadow-xl xl:grid-cols-3">
                      {item.children.map((child) => (
                        <li key={`${child.href}:${child.label}`}>
                          <Link
                            href={child.href}
                            className="text-ink-navy hover:bg-muted block rounded-lg px-3 py-2.5 font-semibold"
                          >
                            {child.label}
                          </Link>
                          {child.children?.length ? (
                            <ul className="px-3 pb-2">
                              {child.children.map((nested) => (
                                <li key={`${nested.href}:${nested.label}`}>
                                  <Link
                                    href={nested.href}
                                    className="text-slate-gray hover:text-primary block py-1.5 text-xs"
                                  >
                                    {nested.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isCurrent(item) ? 'page' : undefined}
                    className="text-ink-navy hover:text-primary aria-[current=page]:text-primary inline-flex min-h-11 items-center rounded-md px-1"
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="icon" aria-label="Tìm kiếm">
            <Link href="/tim-kiem">
              <Search aria-hidden />
            </Link>
          </Button>
          <HeaderAuth />
          <Button asChild size="md" className="hidden lg:inline-flex">
            <Link href="/dat-kham">Đặt khám</Link>
          </Button>
          <Button
            ref={menuButton}
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Mở menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu aria-hidden />
          </Button>
        </div>
      </div>
      {menuOpen && (
        <div
          ref={dialog}
          role="dialog"
          aria-modal="true"
          aria-label="Menu điều hướng"
          className="bg-card fixed inset-0 z-50 overflow-y-auto p-4 lg:hidden"
        >
          <div className="border-border flex items-center justify-between border-b pb-4">
            <Logo name={shell?.name} logoUrl={shell?.logoUrl} />
            <Button
              ref={closeButton}
              variant="ghost"
              size="icon"
              aria-label="Đóng menu"
              onClick={() => {
                setMenuOpen(false);
                menuButton.current?.focus();
              }}
            >
              <X aria-hidden />
            </Button>
          </div>
          <nav aria-label="Menu mobile" className="py-6">
            <ul className="space-y-1">
              {nav.map((item) => (
                <li key={`${item.href}:${item.label}`}>
                  <Link
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className="text-ink-navy hover:bg-muted flex min-h-12 items-center rounded-md px-3 font-semibold"
                  >
                    {item.label}
                  </Link>
                  {item.children && (
                    <ul className="border-border ml-4 border-l pl-3">
                      {item.children.map((child) => (
                        <li key={`${child.href}:${child.label}`}>
                          <Link
                            href={child.href}
                            onClick={() => setMenuOpen(false)}
                            className="text-slate-gray hover:bg-muted flex min-h-11 items-center rounded-md px-3 text-sm"
                          >
                            {child.label}
                          </Link>
                          {child.children?.length ? (
                            <ul className="border-border ml-3 border-l pl-2">
                              {child.children.map((nested) => (
                                <li key={`${nested.href}:${nested.label}`}>
                                  <Link
                                    href={nested.href}
                                    onClick={() => setMenuOpen(false)}
                                    className="text-slate-gray flex min-h-11 items-center px-3 text-sm"
                                  >
                                    {nested.label}
                                  </Link>
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
          <div className="border-border space-y-3 border-t pt-6">
            <Button asChild className="w-full" onClick={() => setMenuOpen(false)}>
              <Link href="/dat-kham">Đặt khám</Link>
            </Button>
            <Link
              href="/tai-khoan"
              onClick={() => setMenuOpen(false)}
              className="text-ink-navy hover:bg-muted border-border flex min-h-11 items-center justify-center rounded-md border font-medium"
            >
              Tài khoản / Đăng nhập
            </Link>
            <a
              className="text-slate-gray block py-2 text-center text-sm"
              href={`tel:${hotline.replace(/\s/g, '')}`}
            >
              Hỗ trợ: {hotline}
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
