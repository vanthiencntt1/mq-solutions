'use client';

import { Cookie, Settings2, ShieldCheck, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  configureAnalytics,
  disableAnalytics,
  loadAnalytics,
  track,
  trackPageView,
} from '@/components/features/analytics/client';
import { Button } from '@/components/ui/button';
import {
  CONSENT_COOKIE,
  consentCookieValue,
  parseConsentCookie,
  safePagePath,
  type AnalyticsConsent,
} from '@/lib/domain/analytics/privacy';
import type { AnalyticsConfig } from '@/lib/domain/analytics/ports';

// C10 mục 2: lựa chọn này tách khỏi đồng ý xử lý dữ liệu khi đăng ký.
export function ConsentManager({ config, nonce }: { config: AnalyticsConfig; nonce: string }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<AnalyticsConsent | 'loading'>('loading');
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const previousPath = useRef(pathname);
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  useEffect(() => {
    const syncConsent = () => setConsent(parseConsentCookie(document.cookie));
    syncConsent();
    window.addEventListener('focus', syncConsent);
    document.addEventListener('visibilitychange', syncConsent);
    return () => {
      window.removeEventListener('focus', syncConsent);
      document.removeEventListener('visibilitychange', syncConsent);
    };
  }, []);

  useEffect(() => {
    if (consent !== 'accepted' || isAdmin || config.provider === 'OFF') {
      disableAnalytics(config);
      setReady(false);
      return;
    }
    configureAnalytics(config);
    loadAnalytics(config, nonce, () => setReady(true));
  }, [config, consent, isAdmin, nonce]);

  useEffect(() => {
    if (ready && consent === 'accepted' && safePagePath(pathname)) trackPageView();
  }, [pathname, ready, consent]);

  useEffect(() => {
    if (consent === 'accepted') {
      if (/^\/co-so\/[^/]+$/.test(pathname)) track('facility_viewed');
      if (
        previousPath.current === '/dang-nhap' &&
        pathname !== '/dang-nhap' &&
        document.cookie.split('; ').includes('mq_auth=1')
      )
        track('login_completed');
    }
    previousPath.current = pathname;
  }, [pathname, consent]);

  function choose(value: Exclude<AnalyticsConsent, 'unset'>) {
    document.cookie = `${CONSENT_COOKIE}=${consentCookieValue(value)}; Path=/; Max-Age=${180 * 24 * 60 * 60}; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    setConsent(value);
    setOpen(false);
  }

  if (isAdmin || consent === 'loading') return null;

  return (
    <>
      {(consent === 'unset' || open) && (
        <section
          aria-label="Lựa chọn cookie phân tích"
          className="border-hairline bg-paper text-ink-navy fixed right-4 bottom-4 left-4 z-50 max-h-[40dvh] overflow-y-auto rounded-xl border p-4 shadow-lg sm:left-auto sm:w-full sm:max-w-md"
        >
          <div className="flex items-start gap-3">
            <span className="bg-info-bg text-primary grid size-10 shrink-0 place-items-center rounded-lg">
              <Cookie className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <h2 className="text-xl font-bold">Cookie phân tích</h2>
              <p className="text-slate-gray text-sm leading-5">
                Chỉ dùng cookie phân tích khi bạn đồng ý. Không gửi thông tin cá nhân hay dữ liệu khám bệnh.
              </p>
              <Link
                href="/chinh-sach/chinh-sach-bao-mat"
                className="text-ink-navy focus-visible:outline-primary inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 focus-visible:outline-2"
              >
                Xem chính sách bảo mật
              </Link>
            </div>
            {open && consent !== 'unset' && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Đóng cài đặt cookie"
                className="focus-visible:ring-primary flex size-11 shrink-0 items-center justify-center rounded-md focus-visible:ring-2"
              >
                <X className="size-5" aria-hidden />
              </button>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => choose('rejected')}
              className="min-w-0 px-2 text-sm"
            >
              Không đồng ý
            </Button>
            <Button type="button" onClick={() => choose('accepted')} className="min-w-0 px-2 text-sm">
              <ShieldCheck className="size-4" aria-hidden /> Đồng ý
            </Button>
          </div>
        </section>
      )}
      {consent !== 'unset' && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="border-hairline bg-paper text-ink-navy focus-visible:ring-primary fixed bottom-4 left-4 z-40 flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm shadow-sm focus-visible:ring-2"
        >
          <Settings2 className="size-4" aria-hidden /> Cài đặt cookie
        </button>
      )}
    </>
  );
}
