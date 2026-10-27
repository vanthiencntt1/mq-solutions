'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SiteBanner } from '@/lib/domain/ports';

export function BannerCarousel({ banners }: { banners: SiteBanner[] }) {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (banners.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % banners.length), 5000);
    return () => window.clearInterval(timer);
  }, [banners.length]);
  if (!banners.length) return null;
  const banner = banners[index] ?? banners[0];
  if (!banner) return null;
  const picture = (
    <picture className="border-hairline bg-paper block overflow-hidden rounded-xl border shadow-lg">
      {banner.imageMobileUrl && <source media="(max-width: 767px)" srcSet={banner.imageMobileUrl} />}
      <Image
        src={banner.imageUrl}
        alt={banner.title || 'Thông tin từ MQ Solutions'}
        width={1200}
        height={360}
        unoptimized
        priority={index === 0}
        className="aspect-[3/2] w-full object-cover md:aspect-[10/3]"
      />
    </picture>
  );
  return (
    <section className="container-page py-8 md:py-12" aria-label="Thông tin nổi bật">
      {banner.link ? (
        <Link href={banner.link} aria-label={banner.title || 'Xem thông tin nổi bật'}>
          {picture}
        </Link>
      ) : (
        picture
      )}
      {banners.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            type="button"
            aria-label="Banner trước"
            onClick={() => setIndex((index - 1 + banners.length) % banners.length)}
            className="border-hairline bg-paper text-ink-navy hover:bg-info-bg grid size-11 place-items-center rounded-lg border shadow-sm"
          >
            <ChevronLeft aria-hidden />
          </button>
          <span className="text-slate-gray text-sm" aria-live="polite">
            {index + 1} / {banners.length}
          </span>
          <button
            type="button"
            aria-label="Banner tiếp"
            onClick={() => setIndex((index + 1) % banners.length)}
            className="border-hairline bg-paper text-ink-navy hover:bg-info-bg grid size-11 place-items-center rounded-lg border shadow-sm"
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      )}
    </section>
  );
}

export function SiteBannerPlacement({ banners }: { banners: SiteBanner[] }) {
  const path = usePathname();
  if (path === '/') return null;
  const placement = path.startsWith('/co-so')
    ? 'FACILITY'
    : path.startsWith('/tin-tuc')
      ? 'NEWS'
      : path.startsWith('/huong-dan')
        ? 'GUIDE'
        : path;
  return <BannerCarousel banners={banners.filter((banner) => banner.placement === placement)} />;
}
