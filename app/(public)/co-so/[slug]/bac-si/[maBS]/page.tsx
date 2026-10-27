import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DecorBlob } from '@/components/ui/decor-blob';
import { SectionHeader } from '@/components/ui/section-header';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';
import { formatDate, formatMoney } from '@/lib/utils/format';

export const revalidate = 300;

type Params = { slug: string; maBS: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, maBS } = await params;
  try {
    const entry = await getFacilityPublicService().doctor(slug, maBS);
    return { title: entry ? `${entry.doctor.name} – Lịch khám` : 'Không tìm thấy bác sĩ' };
  } catch {
    return { title: 'Lịch khám bác sĩ' };
  }
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug, maBS } = await params;
  const entry = await getFacilityPublicService().doctor(slug, maBS);
  if (!entry) notFound();
  const { doctor, facility } = entry;
  const dates = [...new Set(entry.schedules.map((schedule) => schedule.date))].sort();
  const timesByDate = new Map(
    dates.map((date) => [
      date,
      [
        ...new Set(
          entry.schedules
            .filter((schedule) => schedule.date === date)
            .map((schedule) => schedule.slotTime)
            .filter((time): time is string => Boolean(time)),
        ),
      ].sort(),
    ]),
  );
  const bookingUrl = `/dat-kham?co-so=${encodeURIComponent(facility.code)}`;
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: doctor.name,
    ...(doctor.title ? { jobTitle: doctor.title } : {}),
    ...(entry.specialtyName ? { medicalSpecialty: entry.specialtyName } : {}),
    worksFor: { '@type': 'MedicalClinic', name: facility.name },
    url: `${base}/co-so/${encodeURIComponent(slug)}/bac-si/${encodeURIComponent(maBS)}`,
  }).replace(/</g, '\\u003c');
  return (
    <div className="container-page py-12 md:py-16">
      <script type="application/ld+json">{jsonLd}</script>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] lg:items-start">
        <header>
          <div
            className="bg-info-bg text-primary flex size-20 items-center justify-center rounded-full text-[32px] font-bold"
            aria-hidden="true"
          >
            {doctor.name.trim().charAt(0)}
          </div>
          <Badge className="mt-5">{entry.specialtyName ?? 'Bác sĩ'}</Badge>
          <h1 className="text-ink-navy md:text-heading mt-3 text-[42px] leading-tight font-bold">
            {doctor.title ? `${doctor.title} ` : ''}
            {doctor.name}
          </h1>
          <p className="text-slate-gray mt-4 flex items-start gap-2">
            <MapPin className="mt-1 size-5 shrink-0" aria-hidden />
            {facility.name} · {facility.address}
          </p>
          {entry.price !== null && (
            <p className="text-ink-navy mt-6 font-semibold">Giá khám từ {formatMoney(entry.price)}</p>
          )}
        </header>
        <div className="relative isolate">
          <DecorBlob tone="cyan" className="-top-6 -right-6 -z-10" />
          <Card variant="panel" className="shadow-lg">
            <h2 className="text-ink-navy text-[24px] font-bold">Đặt lịch khám</h2>
            <p className="text-slate-gray mt-3">Chọn chuyên khoa, bác sĩ và giờ khám ở bước tiếp theo.</p>
            <Button asChild size="lg" className="mt-6 w-full">
              <Link href={bookingUrl}>
                <CalendarDays aria-hidden /> Đặt khám
              </Link>
            </Button>
          </Card>
        </div>
      </div>
      <section className="mt-12 md:mt-16">
        <SectionHeader
          align="left"
          title="Lịch khám 14 ngày tới"
          description="Những ngày có lịch từ hệ thống của cơ sở."
        />
        {entry.scheduleUnavailable ? (
          <p className="text-warning mt-5">Lịch khám tạm gián đoạn. Vui lòng thử lại sau.</p>
        ) : dates.length ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dates.map((date) => (
              <Card key={date} className="space-y-4">
                <h3 className="text-ink-navy flex items-center gap-2 text-[24px] font-bold">
                  <CalendarDays className="text-primary size-5" aria-hidden="true" />
                  {formatDate(`${date}T00:00:00+07:00`)}
                </h3>
                {Boolean(timesByDate.get(date)?.length) && (
                  <div className="flex flex-wrap gap-2">
                    {timesByDate.get(date)?.map((time) => (
                      <span
                        key={time}
                        className="border-hairline bg-pebble text-ink-navy inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                )}
                <Button asChild variant="outline" size="sm">
                  <Link href={bookingUrl}>Chọn giờ khám</Link>
                </Button>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-slate-gray mt-5">Chưa có lịch khám sắp tới. Vui lòng quay lại sau.</p>
        )}
      </section>
    </div>
  );
}
