import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { SectionData } from './home-sections';
import type { HomeFacility } from './types';

export function FeaturedFacilities({
  facilities,
  loadError = false,
  data = {},
}: {
  facilities: (HomeFacility & { specialtyCount?: number })[];
  loadError?: boolean;
  data?: SectionData;
}) {
  if (loadError || !facilities.length) return null;
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="featured-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="featured-title" className="section-title">
            {data.title || 'Cơ sở y tế nổi bật'}
          </h2>
          <p className="text-slate-gray mt-3">
            {data.description || 'Tìm nơi khám phù hợp và xem lịch còn chỗ.'}
          </p>
        </div>
        <Link
          href="/co-so-y-te"
          className="text-primary inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
        >
          Xem tất cả <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {facilities.map((facility) => (
          <article
            key={facility.code}
            className="border-hairline bg-card flex min-w-0 flex-col gap-5 rounded-2xl border p-5 shadow-sm sm:flex-row sm:p-6"
          >
            <div className="border-hairline bg-cloud flex size-24 shrink-0 items-center justify-center rounded-xl border p-3">
              {facility.logoUrl ? (
                <Image
                  src={facility.logoUrl}
                  alt={`Logo ${facility.name}`}
                  width={80}
                  height={80}
                  unoptimized
                  className="max-h-full w-auto object-contain"
                />
              ) : (
                <Building2 className="text-primary size-10" strokeWidth={1.75} aria-hidden />
              )}
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <h3 className="text-ink-navy text-[22px] leading-snug font-bold">{facility.name}</h3>
              <p className="text-slate-gray mt-2 flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{facility.address}</span>
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge tone="success">Nhận đặt khám online</Badge>
                {facility.specialtyCount ? (
                  <span className="text-slate-gray text-sm">{facility.specialtyCount} chuyên khoa</span>
                ) : null}
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-5">
                <Link
                  href={`/co-so/${facility.slug}`}
                  className="border-hairline text-ink-navy hover:bg-pebble inline-flex min-h-11 items-center rounded-md border px-4 font-semibold"
                >
                  Xem cơ sở
                </Link>
                <Button asChild size="md">
                  <Link href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}`}>Đặt khám</Link>
                </Button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
