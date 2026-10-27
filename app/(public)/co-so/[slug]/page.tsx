import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, Clock3, MapPin, Phone, Star, WifiOff } from 'lucide-react';
import { z } from 'zod';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ContentBlocksSchema } from '@/lib/domain/content/blocks';
import { canBook, getFacilityPublicService } from '@/lib/services/facility-public-service';
import { formatDate, formatMoney, formatPhone } from '@/lib/utils/format';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const facility = await getFacilityPublicService().facility(slug);
  return facility
    ? {
        title: `${facility.name} – Đặt lịch khám online | MQ Solutions`,
        description: facility.shortDesc ?? facility.address,
      }
    : { title: 'Không tìm thấy cơ sở' };
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
  const intro = ContentBlocksSchema.safeParse(facility.introJson);
  const introPlain = z.array(z.object({ type: z.string(), text: z.string() })).safeParse(facility.introJson);
  const mapsUrl =
    facility.lat !== null && facility.lng !== null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${facility.lat},${facility.lng}`)}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facility.address)}`;
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
    ...(hours.success
      ? { openingHours: Object.entries(hours.data).map(([day, value]) => `${day} ${value}`) }
      : {}),
  }).replace(/</g, '\\u003c');

  return (
    <div className="container-page py-10 md:py-16">
      <script type="application/ld+json">{jsonLd}</script>
      <div className="grid gap-8 lg:grid-cols-[1.4fr_0.6fr] lg:items-start">
        <div>
          <Badge tone="info">Cơ sở y tế</Badge>
          <h1 className="text-ink-navy mt-4 text-[32px] leading-tight font-bold md:text-[50px]">
            {facility.name}
          </h1>
          <p className="text-slate-gray mt-4 flex items-start gap-2">
            <MapPin className="mt-1 size-5 shrink-0" aria-hidden />
            {facility.address}
          </p>
          <p className="text-slate-gray mt-3 flex items-center gap-2">
            <Star className="text-warning size-5" aria-hidden />
            {facility.rating === null
              ? 'Chưa có đánh giá'
              : `${facility.rating.toFixed(1)} · ${facility.reviewCount} đánh giá`}
          </p>
          {facility.shortDesc && (
            <p className="text-slate-gray mt-6 max-w-2xl text-lg">{facility.shortDesc}</p>
          )}
          {!available && (
            <Badge tone="warning" className="mt-6">
              <WifiOff className="size-4" aria-hidden /> Tạm ngưng đặt khám online
            </Badge>
          )}
        </div>
        <Card className="lg:sticky lg:top-24">
          <h2 className="text-ink-navy text-xl font-semibold">Thông tin đặt khám</h2>
          {facility.hotline && (
            <p className="text-slate-gray mt-4 flex gap-2">
              <Phone className="mt-1 size-4 shrink-0" aria-hidden /> Tổng đài: {formatPhone(facility.hotline)}
            </p>
          )}
          {hours.success && (
            <div className="mt-4">
              <p className="text-ink-navy flex items-center gap-2 font-semibold">
                <Clock3 className="size-4" aria-hidden /> Giờ làm việc
              </p>
              <dl className="text-slate-gray mt-2 space-y-1 text-sm">
                {Object.entries(hours.data).map(([day, value]) => (
                  <div key={day} className="flex justify-between gap-4">
                    <dt>{day}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
          {available ? (
            <Button asChild className="mt-6 w-full">
              <Link href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}`}>
                <CalendarDays aria-hidden /> Đặt khám ngay
              </Link>
            </Button>
          ) : (
            <p className="text-warning mt-5 text-sm">Vui lòng liên hệ cơ sở để được hỗ trợ đặt khám.</p>
          )}
          <Button asChild variant="outline" className="mt-3 w-full">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <MapPin aria-hidden /> Chỉ đường
            </a>
          </Button>
        </Card>
      </div>

      {facility.images.length > 0 && (
        <section aria-label="Hình ảnh cơ sở" className="mt-10 grid gap-3 md:grid-cols-3">
          {facility.images.slice(0, 3).map((src, index) => (
            <div key={`${src}-${index}`} className="bg-muted relative h-48 overflow-hidden rounded-xl">
              <Image
                src={src}
                alt={`${facility.name} – ảnh ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          ))}
        </section>
      )}

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.8fr]">
        <section>
          <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Giới thiệu</h2>
          <div className="mt-5">
            {intro.success ? (
              <BlockRenderer blocks={intro.data} />
            ) : introPlain.success ? (
              <div className="text-slate-gray space-y-4">
                {introPlain.data.map((block, index) => (
                  <p key={index}>{block.text}</p>
                ))}
              </div>
            ) : (
              <p className="text-slate-gray">
                {facility.shortDesc ?? 'Thông tin giới thiệu đang được cập nhật.'}
              </p>
            )}
          </div>
        </section>
        <section>
          <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Chuyên khoa</h2>
          {catalog?.specialties ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {catalog.specialties.map((specialty) => (
                <Link
                  key={specialty.id}
                  href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}&chuyen-khoa=${encodeURIComponent(specialty.id)}`}
                  className="border-border bg-card text-ink-navy rounded-full border px-4 py-2 text-sm hover:underline"
                >
                  {specialty.name}
                </Link>
              ))}
              {catalog.specialties.length === 0 && (
                <p className="text-slate-gray">Chưa có chuyên khoa để đặt lịch.</p>
              )}
            </div>
          ) : (
            <p className="text-warning mt-5">Danh mục chuyên khoa tạm gián đoạn. Vui lòng thử lại sau.</p>
          )}
        </section>
      </div>

      <section className="mt-12">
        <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Bác sĩ</h2>
        {catalog?.doctors ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {catalog.doctors.slice(0, 9).map((doctor) => (
              <Card key={doctor.id}>
                <p className="text-ink-navy font-semibold">
                  {doctor.title ? `${doctor.title} ` : ''}
                  {doctor.name}
                </p>
                {facility.bookingMode !== 'SPECIALTY' && (
                  <Link
                    href={`/co-so/${encodeURIComponent(facility.slug)}/bac-si/${encodeURIComponent(doctor.id)}`}
                    className="text-info mt-3 inline-block text-sm font-semibold hover:underline"
                  >
                    Xem lịch khám
                  </Link>
                )}
              </Card>
            ))}
            {catalog.doctors.length === 0 && <p className="text-slate-gray">Chưa có bác sĩ để hiển thị.</p>}
          </div>
        ) : (
          <p className="text-warning mt-5">Danh mục bác sĩ tạm gián đoạn. Vui lòng thử lại sau.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Bảng giá khám</h2>
        {catalog?.prices || catalog?.rooms ? (
          <div className="border-border bg-card mt-5 overflow-hidden rounded-xl border">
            <ul className="divide-border divide-y">
              {catalog.prices?.map((price) => (
                <li key={price.ID} className="flex justify-between gap-4 px-5 py-3">
                  <span>{price.Name}</span>
                  <strong>{formatMoney(price.Price)}</strong>
                </li>
              ))}
              {catalog.rooms?.map((room) => (
                <li key={`room-${room.id}`} className="flex justify-between gap-4 px-5 py-3">
                  <span>{room.name}</span>
                  <strong>{formatMoney(room.priceDv)}</strong>
                </li>
              ))}
            </ul>
            {!catalog.prices?.length && !catalog.rooms?.length && (
              <p className="text-slate-gray p-5">Bảng giá đang được cập nhật.</p>
            )}
          </div>
        ) : (
          <p className="text-warning mt-5">Bảng giá tạm gián đoạn. Vui lòng thử lại sau.</p>
        )}
      </section>

      <section className="mt-12">
        <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Vị trí</h2>
        <Card className="mt-5">
          <p className="text-slate-gray">{facility.address}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-info mt-3 inline-flex items-center gap-2 font-semibold hover:underline"
          >
            <MapPin className="size-4" aria-hidden /> Mở Google Maps
          </a>
        </Card>
      </section>
      <section className="mt-12">
        <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Đánh giá</h2>
        {reviews.length ? (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id}>
                <p className="text-warning font-semibold">
                  ★ {review.rating}/5{' '}
                  <span className="text-slate-gray ml-2 text-sm font-normal">
                    {formatDate(review.createdAt)}
                  </span>
                </p>
                {review.comment && <p className="mt-3">{review.comment}</p>}
                {review.reply && (
                  <p className="text-slate-gray mt-3 text-sm">Phản hồi từ cơ sở: {review.reply}</p>
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-slate-gray mt-5">Chưa có đánh giá được công bố.</p>
        )}
      </section>
      <div className="mt-10">
        <Link href="/tai-khoan/co-so" className="text-info font-semibold hover:underline">
          Xem hồ sơ của tôi tại cơ sở này
        </Link>
      </div>
    </div>
  );
}
