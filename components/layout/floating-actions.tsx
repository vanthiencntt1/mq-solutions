'use client';

import { ArrowUp, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE, type PublicShell } from '@/lib/config/site';

export function FloatingActions({ shell }: { shell?: PublicShell }) {
  const [showTop, setShowTop] = useState(false);
  const hotline = shell?.hotline ?? SITE.hotline;

  useEffect(() => {
    // W01 mục 4: chỉ hiện nút lên đầu khi đã cuộn qua khoảng hai màn hình.
    const onScroll = () => setShowTop(window.scrollY > window.innerHeight * 2);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed right-4 bottom-20 z-30 flex flex-col gap-2 lg:bottom-6">
      {showTop && (
        <button
          type="button"
          aria-label="Lên đầu trang"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="border-border bg-card text-ink-navy grid size-11 place-items-center rounded-md border shadow-md"
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      )}
      {shell?.zaloUrl && (
        <a
          href={shell.zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-border bg-card text-ink-navy grid min-h-11 place-items-center rounded-md border px-3 text-sm font-semibold shadow-md"
        >
          Zalo
        </a>
      )}
      <a
        href={`tel:${hotline.replace(/\s/g, '')}`}
        aria-label={`Gọi hỗ trợ ${hotline}`}
        className="bg-secondary text-secondary-foreground grid size-11 place-items-center rounded-md shadow-md"
      >
        <Phone className="size-5" aria-hidden />
      </a>
    </div>
  );
}
