import Image from 'next/image';
import { CalendarDays, Clock3, Hospital, MapPin, Stethoscope, Wallet } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils/format';

export type BookingSummaryData = {
  facilityName?: string;
  facilityLogoUrl?: string | null;
  facilityAddress?: string;
  specialtyName?: string;
  date?: string;
  time?: string;
  roomName?: string;
  amount?: number;
};

export function BookingSummary({ data }: { data: BookingSummaryData }) {
  const rows = [
    { label: 'Chuyên khoa', value: data.specialtyName, icon: Stethoscope },
    { label: 'Ngày khám', value: data.date, icon: CalendarDays },
    { label: 'Khung giờ', value: data.time, icon: Clock3 },
    { label: 'Phòng khám', value: data.roomName, icon: MapPin },
  ].filter((row) => row.value);

  return (
    <Card variant="panel" className="space-y-5">
      <div>
        <p className="text-primary text-xs font-bold tracking-wide uppercase">Lịch của bạn</p>
        <h3 className="mt-1 text-[24px] leading-tight font-bold">Tóm tắt lịch khám</h3>
      </div>
      {data.facilityName && (
        <div className="border-hairline flex items-start gap-3 border-b pb-5">
          <span className="border-hairline bg-pebble flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
            {data.facilityLogoUrl ? (
              <Image
                src={data.facilityLogoUrl}
                alt=""
                width={48}
                height={48}
                unoptimized
                className="size-full object-contain"
              />
            ) : (
              <Hospital className="text-primary size-6" strokeWidth={1.75} aria-hidden />
            )}
          </span>
          <div className="min-w-0">
            <p className="leading-snug font-semibold">{data.facilityName}</p>
            {data.facilityAddress && (
              <p className="text-slate-gray mt-1 text-sm leading-5">{data.facilityAddress}</p>
            )}
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <dl className="space-y-4">
          {rows.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex gap-3">
              <Icon className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden />
              <div className="min-w-0">
                <dt className="text-slate-gray text-sm">{label}</dt>
                <dd className="text-ink-navy font-semibold wrap-break-word">{value}</dd>
              </div>
            </div>
          ))}
        </dl>
      )}
      {data.amount !== undefined && (
        <div className="border-hairline flex items-center justify-between gap-3 border-t pt-5">
          <span className="text-slate-gray flex items-center gap-2 text-sm">
            <Wallet className="text-primary size-5" strokeWidth={1.75} aria-hidden /> Chi phí dự kiến
          </span>
          <strong className="text-primary text-lg tabular-nums">{formatMoney(data.amount)}</strong>
        </div>
      )}
    </Card>
  );
}
