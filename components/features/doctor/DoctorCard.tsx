import Link from 'next/link';
import { CalendarDays, MapPin, UserRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils/format';

interface DoctorDisplay {
  facility: { code: string; slug: string; name: string; address: string };
  doctor: { id: string; name: string; title?: string };
  specialtyName: string | null;
  schedules: { date: string }[];
  scheduleUnavailable: boolean;
  price: number | null;
}

export function DoctorCard({ entry }: { entry: DoctorDisplay }) {
  const { facility, doctor, schedules } = entry;
  const detailUrl = `/co-so/${encodeURIComponent(facility.slug)}/bac-si/${encodeURIComponent(doctor.id)}`;
  const dates = [...new Set(schedules.map((schedule) => schedule.date))].sort();
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-start gap-4">
        <div className="bg-info-bg text-info flex size-14 shrink-0 items-center justify-center rounded-full">
          <UserRound className="size-7" aria-hidden />
        </div>
        <div>
          <Badge>{entry.specialtyName ?? 'Bác sĩ'}</Badge>
          <h2 className="text-ink-navy mt-2 text-xl font-semibold">
            <Link href={detailUrl} className="hover:underline">
              {doctor.title ? `${doctor.title} ` : ''}
              {doctor.name}
            </Link>
          </h2>
        </div>
      </div>
      <p className="text-slate-gray mt-5 flex gap-2 text-sm">
        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {facility.name} · {facility.address}
      </p>
      <p className="text-slate-gray mt-3 flex gap-2 text-sm">
        <CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden />
        {entry.scheduleUnavailable
          ? 'Lịch khám tạm gián đoạn'
          : dates.length
            ? `${dates.length} ngày có lịch trong 14 ngày tới`
            : 'Chưa có lịch khám sắp tới'}
      </p>
      <p className="text-ink-navy mt-3 text-sm font-semibold">
        {entry.price === null ? 'Giá khám đang cập nhật' : `Giá khám từ ${formatMoney(entry.price)}`}
      </p>
      <div className="mt-auto flex flex-wrap gap-2 pt-6">
        <Button asChild variant="outline" size="sm">
          <Link href={detailUrl}>Xem lịch khám</Link>
        </Button>
        <Button asChild size="sm">
          <Link
            href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}&bac-si=${encodeURIComponent(doctor.id)}`}
          >
            Đặt khám
          </Link>
        </Button>
      </div>
    </Card>
  );
}
