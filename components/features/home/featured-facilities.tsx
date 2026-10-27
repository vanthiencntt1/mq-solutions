import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { HomeFacility } from './types';

export function FeaturedFacilities({
  facilities,
  loadError = false,
}: {
  facilities: HomeFacility[];
  loadError?: boolean;
}) {
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="featured-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-info mb-2 text-sm font-semibold">ĐỐI TÁC ĐỒNG HÀNH</p>
          <h2 id="featured-title" className="text-[26px] leading-tight md:text-[38px]">
            Cơ sở y tế nổi bật
          </h2>
          <p className="text-slate-gray mt-3 max-w-xl">
            Tìm nơi khám phù hợp và bắt đầu đặt lịch trực tuyến.
          </p>
        </div>
        <Link
          href="/co-so-y-te"
          className="text-ink-navy inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
        >
          Xem tất cả <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      {loadError ? (
        <Card role="alert" className="text-danger bg-danger-bg">
          Không thể tải cơ sở nổi bật lúc này. Vui lòng thử lại sau ít phút.
        </Card>
      ) : facilities.length ? (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-2 md:overflow-visible md:px-0 lg:grid-cols-3">
          {facilities.map((facility) => (
            <Card key={facility.code} className="min-w-[280px] snap-start p-5 md:min-w-0 md:p-6">
              <div className="border-border bg-cloud mb-5 flex h-32 items-center justify-center overflow-hidden rounded-lg border">
                {facility.logoUrl ? (
                  <Image
                    src={facility.logoUrl}
                    alt={`Logo ${facility.name}`}
                    width={144}
                    height={96}
                    unoptimized
                    className="max-h-24 w-auto max-w-[80%] object-contain"
                  />
                ) : (
                  <Building2 className="text-mist-gray size-12" strokeWidth={1.5} aria-hidden />
                )}
              </div>
              <h3 className="text-ink-navy line-clamp-2 min-h-14 text-[20px] leading-snug font-semibold">
                {facility.name}
              </h3>
              <p className="text-slate-gray mt-3 flex min-h-12 items-start gap-2 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span className="line-clamp-2">{facility.address}</span>
              </p>
              <div className="border-border mt-5 flex items-center justify-between gap-3 border-t pt-4 text-sm">
                <Link href={`/co-so/${facility.slug}`} className="text-ink-navy font-medium hover:underline">
                  Xem cơ sở
                </Link>
                <Link
                  href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}`}
                  className="text-primary inline-flex min-h-11 items-center gap-1 font-semibold hover:underline"
                >
                  Đặt khám <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-slate-gray flex items-center gap-3">
          <Building2 className="size-6" aria-hidden />
          Chưa có cơ sở nổi bật. Bạn có thể xem toàn bộ cơ sở y tế.
        </Card>
      )}
    </section>
  );
}
