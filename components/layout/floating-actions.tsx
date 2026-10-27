'use client';

import { ArrowUp, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SITE, type PublicShell } from '@/lib/config/site';

export function FloatingActions({ shell }: { shell?: PublicShell }) {
  const [showTop, setShowTop] = useState(false);
  const hotline = shell?.hotline && shell.hotline !== SITE.hotline ? shell.hotline : undefined;

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
          onClick={() =>
            window.scrollTo({
              top: 0,
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
            })
          }
          className="border-hairline bg-card text-primary hover:bg-info-bg grid size-11 place-items-center rounded-lg border shadow-md"
        >
          <ArrowUp className="size-5" aria-hidden />
        </button>
      )}
      {shell?.zaloUrl && (
        <a
          href={shell.zaloUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="border-hairline bg-card text-primary hover:bg-info-bg grid min-h-11 place-items-center rounded-lg border px-3 text-sm font-semibold shadow-md"
        >
          Zalo
        </a>
      )}
      {hotline && (
        <a
          href={`tel:${hotline.replace(/\s/g, '')}`}
          aria-label={`Gọi hỗ trợ ${hotline}`}
          className="bg-primary text-primary-foreground hover:bg-primary-hover grid size-11 place-items-center rounded-lg shadow-md"
        >
          <Phone className="size-5" aria-hidden />
        </a>
      )}
    </div>
  );
}
