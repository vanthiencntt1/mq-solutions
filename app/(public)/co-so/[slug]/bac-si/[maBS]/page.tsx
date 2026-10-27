import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';
import { formatDate, formatMoney } from '@/lib/utils/format';

export const revalidate = 300;

type Params = { slug: string; maBS: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug, maBS } = await params;
  try {
    const entry = await getFacilityPublicService().doctor(slug, maBS);
    return { title: entry ? `${entry.doctor.name} – Lịch khám | MQ Solutions` : 'Không tìm thấy bác sĩ' };
  } catch {
    return { title: 'Lịch khám bác sĩ | MQ Solutions' };
  }
}

export default async function Page({ params }: { params: Promise<Params> }) {
  const { slug, maBS } = await params;
  const entry = await getFacilityPublicService().doctor(slug, maBS);
  if (!entry) notFound();
  const { doctor, facility } = entry;
  const dates = [...new Set(entry.schedules.map((schedule) => schedule.date))].sort();
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
    <div className="container-page py-10 md:py-16">
      <script type="application/ld+json">{jsonLd}</script>
      <div className="grid gap-8 lg:grid-cols-[1fr_0.65fr]">
        <div>
          <div className="bg-info-bg text-info flex size-16 items-center justify-center rounded-full">
            <UserRound className="size-8" aria-hidden />
          </div>
          <Badge className="mt-5">{entry.specialtyName ?? 'Bác sĩ'}</Badge>
          <h1 className="text-ink-navy mt-3 text-[32px] font-bold md:text-[50px]">
            {doctor.title ? `${doctor.title} ` : ''}
            {doctor.name}
          </h1>
          <p className="text-slate-gray mt-4 flex items-start gap-2">
            <MapPin className="mt-1 size-5 shrink-0" aria-hidden />
            {facility.name} · {facility.address}
          </p>
          <p className="text-ink-navy mt-6 font-semibold">
            {entry.price === null ? 'Giá khám đang cập nhật' : `Giá khám từ ${formatMoney(entry.price)}`}
          </p>
        </div>
        <Card>
          <h2 className="text-ink-navy text-xl font-semibold">Đặt lịch với bác sĩ</h2>
          <p className="text-slate-gray mt-3">Chọn ngày có lịch rồi tiếp tục chọn giờ khám.</p>
          <Button asChild className="mt-6 w-full">
            <Link
              href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}&bac-si=${encodeURIComponent(doctor.id)}`}
            >
              <CalendarDays aria-hidden /> Đặt khám
            </Link>
          </Button>
        </Card>
      </div>
      <section className="mt-12">
        <h2 className="text-ink-navy text-[26px] font-bold md:text-[38px]">Lịch khám 14 ngày tới</h2>
        {entry.scheduleUnavailable ? (
          <p className="text-warning mt-5">Lịch khám tạm gián đoạn. Vui lòng thử lại sau.</p>
        ) : dates.length ? (
          <div className="mt-6 flex flex-wrap gap-3">
            {dates.map((date) => (
              <Button key={date} asChild variant="outline">
                <Link
                  href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}&bac-si=${encodeURIComponent(doctor.id)}&ngay=${encodeURIComponent(date)}`}
                >
                  <CalendarDays aria-hidden /> {formatDate(`${date}T00:00:00+07:00`)}
                </Link>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-slate-gray mt-5">Chưa có lịch khám sắp tới. Vui lòng quay lại sau.</p>
        )}
      </section>
    </div>
  );
}
