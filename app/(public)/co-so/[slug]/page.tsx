import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpRight, CalendarDays, Clock3, MapPin, Phone, Star } from 'lucide-react';
import { z } from 'zod';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { SpecialtyIcon } from '@/components/features/specialty/specialty-icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DecorBlob } from '@/components/ui/decor-blob';
import { IconTile } from '@/components/ui/icon-tile';
import { SectionHeader } from '@/components/ui/section-header';
import { ContentBlocksSchema } from '@/lib/domain/content/blocks';
import { canBook, getFacilityPublicService } from '@/lib/services/facility-public-service';
import { formatDate, formatMoney, formatPhone } from '@/lib/utils/format';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getFacilityPublicService().facility(slug);
  return facility
    ? {
        title: `${facility.name} – Đặt lịch khám online`,
        description: facility.shortDesc ?? facility.address,
      }
    : { title: 'Không tìm thấy cơ sở' };
}

function sortedHours(hours: Record<string, string>) {
  const rank = (day: string) => (/CN|chủ nhật/i.test(day) ? 3 : /T7|thứ 7/i.test(day) ? 2 : 1);
  return Object.entries(hours).sort(([a], [b]) => rank(a) - rank(b));
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getFacilityPublicService();
  const facility = await service.facility(slug);
  if (!facility) notFound();
  const available = canBook(facility);
  const [catalog, reviews] = await Promise.all([
    available ? service.facilityCatalog(facility.code) : Promise.resolve(null),
    service.reviews(facility.id),
  ]);
  const hours = z.record(z.string(), z.string()).safeParse(facility.workingHours);
  const hourRows = hours.success ? sortedHours(hours.data) : [];
  const firstHour = hourRows[0];
  const intro = ContentBlocksSchema.safeParse(facility.introJson);
  const introPlain = z.array(z.object({ type: z.string(), text: z.string() })).safeParse(facility.introJson);
  const hasIntro =
    (intro.success && intro.data.length > 0) || (introPlain.success && introPlain.data.length > 0);
  const mapsUrl =
    facility.lat !== null && facility.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.lat},${facility.lng}`)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`;
  const bookingUrl = `/dat-kham?co-so=${encodeURIComponent(facility.code)}`;
  const priceBySpecialty = new Map<string, number>();
  for (const room of catalog?.rooms ?? []) {
    if (room.priceDv > 0) {
      const previous = priceBySpecialty.get(room.specialtyHisId);
      if (previous === undefined || room.priceDv < previous)
        priceBySpecialty.set(room.specialtyHisId, room.priceDv);
    }
  }
  const specialtiesById = new Map((catalog?.specialties ?? []).map((item) => [item.id, item.name]));
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': facility.type.startsWith('BV_') ? 'Hospital' : 'MedicalClinic',
    name: facility.name,
    url: `${base}/co-so/${encodeURIComponent(facility.slug)}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: facility.address,
      addressLocality: facility.provinceName,
      addressCountry: 'VN',
    },
    ...(facility.lat !== null && facility.lng !== null
      ? { geo: { '@type': 'GeoCoordinates', latitude: facility.lat, longitude: facility.lng } }
      : {}),
    ...(facility.rating !== null
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: facility.rating,
            reviewCount: facility.reviewCount,
          },
        }
      : {}),
    ...(hours.success ? { openingHours: hourRows.map(([day, value]) => `${day} ${value}`) } : {}),
  }).replace(/</g, '\\u003c');

  return (
    <div className="container-page py-12 md:py-16">
      <script type="application/ld+json">{jsonLd}</script>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-start">
        <header>
          <div className="border-hairline bg-card relative flex size-28 items-center justify-center overflow-hidden rounded-xl border shadow-sm">
            {facility.logoUrl ? (
              <Image
                src={facility.logoUrl}
                alt={`Logo ${facility.name}`}
                fill
                sizes="112px"
                unoptimized
                className="object-contain p-3"
              />
            ) : (
              <span className="text-ink-navy text-4xl font-bold" aria-hidden="true">
                {facility.name.slice(0, 1)}
              </span>
            )}
          </div>
          <Badge tone={available ? 'success' : 'warning'} className="mt-6">
            {available ? 'Đang nhận đặt khám online' : 'Tạm ngưng đặt khám online'}
          </Badge>
          <h1 className="text-ink-navy md:text-heading mt-4 text-[42px] leading-[1.15] font-bold">
            {facility.name}
          </h1>
          {facility.shortDesc && (
            <p className="text-slate-gray mt-5 max-w-2xl text-lg">{facility.shortDesc}</p>
          )}
          <div className="text-slate-gray mt-7 space-y-3">
            <p className="flex items-start gap-3">
              <MapPin className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
              {facility.address}
            </p>
            {facility.hotline && (
              <p className="flex items-center gap-3">
                <Phone className="text-primary size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                Tổng đài:{' '}
                <a className="text-ink-navy font-semibold hover:underline" href={`tel:${facility.hotline}`}>
                  {formatPhone(facility.hotline)}
                </a>
              </p>
            )}
            {firstHour && (
              <p className="flex items-start gap-3">
                <Clock3
                  className="text-primary mt-0.5 size-5 shrink-0"
                  strokeWidth={1.75}
                  aria-hidden="true"
                />
                {firstHour[0]}: {firstHour[1]}
              </p>
            )}
            {facility.rating !== null && (
              <p className="flex items-center gap-3">
                <Star className="text-warning size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
                {facility.rating.toFixed(1)} / 5 · {facility.reviewCount} đánh giá
              </p>
            )}
          </div>
        </header>
        <div className="relative isolate lg:sticky lg:top-24">
          <DecorBlob tone="magenta" className="-top-7 -right-5 -z-10" />
          <DecorBlob tone="cyan" className="-bottom-5 -left-6 -z-10" />
          <Card variant="panel" className="p-6 shadow-lg md:p-8">
            <div className="flex items-center gap-3">
              <IconTile>
                <CalendarDays aria-hidden="true" />
              </IconTile>
              <div>
                <p className="text-slate-gray text-sm">Đặt lịch tại</p>
                <h2 className="text-ink-navy text-[24px] font-bold">{facility.name}</h2>
              </div>
            </div>
            {hourRows.length > 0 && (
              <div className="border-hairline mt-6 border-t pt-5">
                <p className="text-ink-navy flex items-center gap-2 font-semibold">
                  <Clock3 className="text-primary size-5" aria-hidden="true" />
                  Giờ làm việc
                </p>
                <dl className="text-slate-gray mt-3 space-y-2 text-sm">
                  {hourRows.map(([day, value]) => (
                    <div key={day} className="flex justify-between gap-4">
                      <dt>{day}</dt>
                      <dd className="text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {available ? (
              <Button asChild size="lg" className="mt-6 w-full">
                <Link href={bookingUrl}>Đặt khám</Link>
              </Button>
            ) : (
              <p className="text-warning mt-6 text-sm">Vui lòng liên hệ cơ sở để được hỗ trợ.</p>
            )}
            <Button asChild variant="outline" className="mt-3 w-full">
              <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                <MapPin aria-hidden="true" />
                Chỉ đường
              </a>
            </Button>
            <p className="text-slate-gray mt-4 text-center text-xs">
              Chọn chuyên khoa và giờ khám ở bước tiếp theo.
            </p>
          </Card>
        </div>
      </div>

      {facility.images.length > 0 && (
        <section aria-label="Hình ảnh cơ sở" className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {facility.images.slice(0, 3).map((src, index) => (
            <div
              key={`${src}-${index}`}
              className="border-hairline bg-pebble relative h-56 overflow-hidden rounded-xl border shadow-sm"
            >
              <Image
                src={src}
                alt={`${facility.name} – ảnh ${index + 1}`}
                fill
                unoptimized
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover"
              />
            </div>
          ))}
        </section>
      )}

      {catalog?.specialties && catalog.specialties.length > 0 && (
        <section className="mt-12 md:mt-16">
          <SectionHeader
            align="left"
            title="Chuyên khoa"
            description="Xem các chuyên khoa đang có tại cơ sở."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.specialties.map((specialty) => (
              <Link
                key={specialty.id}
                href={bookingUrl}
                className="border-hairline bg-card flex min-h-28 items-center gap-4 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md md:p-5"
              >
                <span className="bg-pebble flex size-14 shrink-0 items-center justify-center rounded-2xl md:size-16">
                  <SpecialtyIcon name={specialty.name} size="lg" className="size-14 md:size-16" />
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="text-ink-navy block text-lg">{specialty.name}</strong>
                  {priceBySpecialty.has(specialty.id) && (
                    <span className="text-slate-gray mt-1 block text-sm">
                      Giá khám từ {formatMoney(priceBySpecialty.get(specialty.id)!)}
                    </span>
                  )}
                </span>
                <ArrowUpRight className="text-primary size-5 shrink-0" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {facility.bookingMode !== 'SPECIALTY' && catalog?.doctors && catalog.doctors.length > 0 && (
        <section className="mt-12 md:mt-16">
          <SectionHeader
            align="left"
            title="Bác sĩ"
            description="Xem thông tin bác sĩ và lịch khám tại cơ sở."
          />
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.doctors.slice(0, 9).map((doctor) => (
              <Card key={doctor.id} className="flex flex-col gap-4">
                <div
                  className="bg-info-bg text-primary flex size-14 items-center justify-center rounded-full text-[24px] font-bold"
                  aria-hidden="true"
                >
                  {doctor.name.trim().charAt(0)}
                </div>
                <div>
                  <h3 className="text-ink-navy text-[24px] font-bold">
                    {doctor.title ? `${doctor.title} ` : ''}
                    {doctor.name}
                  </h3>
                  {doctor.specialtyHisId && specialtiesById.has(doctor.specialtyHisId) && (
                    <p className="text-slate-gray mt-1">{specialtiesById.get(doctor.specialtyHisId)}</p>
                  )}
                </div>
                <Link
                  href={`/co-so/${encodeURIComponent(facility.slug)}/bac-si/${encodeURIComponent(doctor.id)}`}
                  className="text-primary mt-auto inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
                >
                  Xem lịch khám <ArrowUpRight className="size-4" aria-hidden="true" />
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {hasIntro && (
        <section className="mt-12 md:mt-16">
          <SectionHeader align="left" title="Giới thiệu" />
          <Card variant="panel" className="text-slate-gray mt-6 max-w-4xl leading-7">
            {intro.success && intro.data.length > 0 ? (
              <BlockRenderer blocks={intro.data} />
            ) : introPlain.success ? (
              <div className="space-y-4">
                {introPlain.data.map((block, index) => (
                  <p key={index}>{block.text}</p>
                ))}
              </div>
            ) : null}
          </Card>
        </section>
      )}

      {(Boolean(catalog?.prices?.length) || Boolean(catalog?.rooms?.length)) && (
        <section className="mt-12 md:mt-16">
          <SectionHeader align="left" title="Bảng giá khám" />
          <Card variant="panel" className="mt-6 max-w-4xl overflow-hidden p-0">
            <ul className="divide-hairline divide-y">
              {catalog?.prices?.map((price) => (
                <li key={price.ID} className="flex flex-wrap justify-between gap-2 px-6 py-4">
                  <span>{price.Name}</span>
                  <strong className="text-ink-navy">{formatMoney(price.Price)}</strong>
                </li>
              ))}
              {catalog?.rooms?.map((room) => (
                <li key={`room-${room.id}`} className="flex flex-wrap justify-between gap-2 px-6 py-4">
                  <span>{room.name}</span>
                  <strong className="text-ink-navy">{formatMoney(room.priceDv)}</strong>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="mt-12 md:mt-16">
          <SectionHeader
            align="left"
            title="Đánh giá từ người bệnh"
            description={`${facility.reviewCount} đánh giá đã được công bố.`}
          />
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-warning flex items-center gap-2 font-semibold">
                    <Star className="size-5 fill-current" aria-hidden="true" />
                    {review.rating}/5 sao
                  </p>
                  <time className="text-slate-gray text-sm" dateTime={review.createdAt.toISOString()}>
                    {formatDate(review.createdAt)}
                  </time>
                </div>
                {review.comment && <p className="text-ink-navy mt-4 whitespace-pre-wrap">{review.comment}</p>}
                {review.reply && (
                  <div className="bg-pebble mt-4 rounded-lg p-4">
                    <strong className="text-ink-navy">Phản hồi của cơ sở</strong>
                    <p className="text-slate-gray mt-1 whitespace-pre-wrap">{review.reply}</p>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12 md:mt-16">
        <SectionHeader align="left" title="Vị trí và chỉ đường" />
        <Card
          variant="panel"
          className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-slate-gray flex items-start gap-3">
            <MapPin className="text-primary mt-0.5 size-5 shrink-0" aria-hidden="true" />
            {facility.address}
          </p>
          <Button asChild variant="outline">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              Mở Google Maps <ArrowUpRight aria-hidden="true" />
            </a>
          </Button>
        </Card>
      </section>
      <div className="mt-10">
        <Link
          href="/tai-khoan/co-so"
          className="text-primary inline-flex min-h-11 items-center font-semibold hover:underline"
        >
          Xem hồ sơ của tôi tại cơ sở này
        </Link>
      </div>
    </div>
  );
}
