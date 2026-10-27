import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate, formatMoney } from '@/lib/utils/format';

interface DoctorDisplay {
  facility: { code: string; slug: string; name: string; address: string };
  doctor: { id: string; name: string; title?: string };
  specialtyName: string | null;
  schedules: { date: string }[];
  scheduleUnavailable: boolean;
  price: number | null;
}

export function DoctorCard({ entry }: { entry: DoctorDisplay }) {
  const { facility, doctor } = entry;
  const detailUrl = `/co-so/${encodeURIComponent(facility.slug)}/bac-si/${encodeURIComponent(doctor.id)}`;
  const dates = [...new Set(entry.schedules.map((schedule) => schedule.date))].sort();
  return (
    <Card className="flex h-full flex-col gap-5 p-6">
      <div className="flex items-start gap-4">
        <div
          className="bg-info-bg text-primary flex size-16 shrink-0 items-center justify-center rounded-full text-[26px] font-bold"
          aria-hidden="true"
        >
          {doctor.name.trim().charAt(0)}
        </div>
        <div className="min-w-0">
          {entry.specialtyName && <Badge>{entry.specialtyName}</Badge>}
          <h3 className="text-ink-navy mt-2 text-[24px] leading-snug font-bold">
            <Link href={detailUrl} className="hover:text-primary">
              {doctor.title ? `${doctor.title} ` : ''}
              {doctor.name}
            </Link>
          </h3>
        </div>
      </div>
      <p className="text-slate-gray flex items-start gap-2 text-sm leading-6">
        <MapPin className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        {facility.name} · {facility.address}
      </p>
      {entry.price !== null && (
        <p className="text-ink-navy font-semibold">Giá khám từ {formatMoney(entry.price)}</p>
      )}
      {dates.length > 0 && (
        <div>
          <p className="text-slate-gray mb-3 flex items-center gap-2 text-sm">
            <CalendarDays className="text-primary size-5" strokeWidth={1.75} aria-hidden="true" />
            Ngày có lịch
          </p>
          <div className="flex flex-wrap gap-2">
            {dates.slice(0, 3).map((date) => (
              <Link
                key={date}
                href={detailUrl}
                className="border-hairline bg-pebble text-ink-navy hover:border-primary inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-sm font-medium"
              >
                {formatDate(`${date}T00:00:00+07:00`)}
              </Link>
            ))}
          </div>
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <Button asChild size="sm">
          <Link href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}`}>Đặt khám</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={detailUrl}>
            Xem lịch <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
