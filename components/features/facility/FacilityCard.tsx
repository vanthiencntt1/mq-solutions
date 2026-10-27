import Image from 'next/image';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Stethoscope, Star, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FacilityDisplay {
  code: string;
  slug: string;
  name: string;
  type: string;
  address: string;
  logoUrl: string | null;
  status: string;
  health: string;
  rating: number | null;
  reviewCount: number;
}

const TYPE_LABELS: Record<string, string> = {
  BV_CONG: 'Bệnh viện công',
  BV_TU: 'Bệnh viện tư',
  PHONG_KHAM: 'Phòng khám',
  PHONG_MACH: 'Phòng mạch',
  XET_NGHIEM: 'Xét nghiệm',
};

export function FacilityCard({
  facility,
  counts,
}: {
  facility: FacilityDisplay;
  counts?: { specialtyCount?: number; doctorCount?: number };
}) {
  const bookable = facility.status === 'ACTIVE' && facility.health !== 'DOWN';
  const detailUrl = `/co-so/${encodeURIComponent(facility.slug)}`;
  return (
    <Card className="flex h-full flex-col gap-5 p-5 md:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="border-hairline bg-card relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border p-3 shadow-sm">
          {facility.logoUrl ? (
            <Image
              src={facility.logoUrl}
              alt={`Logo ${facility.name}`}
              fill
              unoptimized
              sizes="112px"
              className="object-contain p-3"
            />
          ) : (
            <span className="text-ink-navy text-4xl font-bold" aria-hidden="true">
              {facility.name.slice(0, 1)}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-2">
            <Badge>{TYPE_LABELS[facility.type] ?? 'Cơ sở y tế'}</Badge>
            <Badge tone={bookable ? 'success' : 'warning'}>
              {bookable ? 'Đặt khám online' : 'Tạm ngưng đặt khám'}
            </Badge>
          </div>
          <h3 className="text-ink-navy mt-3 text-[24px] leading-snug font-bold">
            <Link href={detailUrl} className="hover:text-primary focus-visible:rounded-sm">
              {facility.name}
            </Link>
          </h3>
          <p className="text-slate-gray mt-3 flex items-start gap-2 text-sm leading-6">
            <MapPin className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            {facility.address}
          </p>
        </div>
      </div>
      {(Boolean(counts?.specialtyCount) || Boolean(counts?.doctorCount) || facility.rating !== null) && (
        <div className="border-hairline text-slate-gray flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-sm">
          {Boolean(counts?.specialtyCount) && (
            <span className="inline-flex items-center gap-2">
              <Stethoscope className="text-primary size-4" strokeWidth={1.75} aria-hidden="true" />
              {counts?.specialtyCount} chuyên khoa
            </span>
          )}
          {Boolean(counts?.doctorCount) && (
            <span className="inline-flex items-center gap-2">
              <UsersRound className="text-primary size-4" strokeWidth={1.75} aria-hidden="true" />
              {counts?.doctorCount} bác sĩ
            </span>
          )}
          {facility.rating !== null && (
            <span className="inline-flex items-center gap-2">
              <Star className="text-warning size-4" strokeWidth={1.75} aria-hidden="true" />
              {facility.rating.toFixed(1)} · {facility.reviewCount} đánh giá
            </span>
          )}
        </div>
      )}
      <div className="mt-auto flex flex-wrap gap-3">
        {bookable && (
          <Button asChild size="sm">
            <Link href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}`}>Đặt khám</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm">
          <Link href={detailUrl}>
            Xem chi tiết <ArrowUpRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </Card>
  );
}
