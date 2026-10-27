'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SitePopup } from '@/lib/domain/ports';
import { DecorBlob } from '@/components/ui/decor-blob';

function storageKey(popup: SitePopup) {
  return `g1-popup:${popup.id}`;
}
function wasSeen(popup: SitePopup): boolean {
  try {
    const storage = popup.frequency === 'ONCE_DAY' ? localStorage : sessionStorage;
    const value = storage.getItem(storageKey(popup));
    if (!value) return false;
    if (popup.frequency === 'ONCE_SESSION') return true;
    return value === new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  } catch {
    return false;
  }
}
function remember(popup: SitePopup) {
  try {
    const storage = popup.frequency === 'ONCE_DAY' ? localStorage : sessionStorage;
    storage.setItem(
      storageKey(popup),
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date()),
    );
  } catch {
    /* W01 mục 5: trình duyệt có thể chặn storage; nút đóng vẫn hoạt động. */
  }
}

export function SitePopup({ popups }: { popups: SitePopup[] }) {
  const pathname = usePathname();
  const [visible, setVisible] = useState<SitePopup | null>(null);
  useEffect(() => {
    if (pathname.startsWith('/dat-kham') || pathname.startsWith('/tai-khoan')) return;
    setVisible(null);
    const candidate = popups.find((popup) => popup.pages.includes(pathname) && !wasSeen(popup));
    if (!candidate) return;
    const timer = window.setTimeout(() => setVisible(candidate), 1200);
    return () => window.clearTimeout(timer);
  }, [pathname, popups]);
  useEffect(() => {
    if (!visible) return;
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        remember(visible);
        setVisible(null);
      }
    };
    window.addEventListener('keydown', dismiss);
    return () => window.removeEventListener('keydown', dismiss);
  }, [visible]);
  if (!visible || !visible.pages.includes(pathname)) return null;
  const close = () => {
    remember(visible);
    setVisible(null);
  };
  const image = (
    <Image
      src={visible.imageUrl}
      alt="Thông báo từ MQ Solutions"
      width={640}
      height={480}
      unoptimized
      className="h-auto max-h-60 w-full object-contain"
    />
  );
  return (
    <div
      className="fixed right-4 bottom-20 left-4 isolate z-50 sm:left-auto sm:w-96 lg:bottom-6"
      role="dialog"
      aria-label="Thông báo"
    >
      <DecorBlob tone="cyan" className="-top-5 -right-3 -z-10" />
      <div className="bg-paper border-hairline relative rounded-2xl border p-4 shadow-lg">
        <button
          type="button"
          onClick={close}
          aria-label="Đóng thông báo"
          className="border-hairline bg-paper text-ink-navy absolute -top-4 -right-2 grid size-11 place-items-center rounded-lg border shadow-md"
        >
          <X aria-hidden />
        </button>
        {visible.link ? (
          <Link href={visible.link} onClick={close}>
            {image}
          </Link>
        ) : (
          image
        )}
      </div>
    </div>
  );
}
