import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, MapPin, Star, WifiOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface FacilityDisplay {
  code: string;
  slug: string;
  name: string;
  type: string;
  address: string;
  images: string[];
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

export function FacilityCard({ facility }: { facility: FacilityDisplay }) {
  const bookable = facility.status === 'ACTIVE' && facility.health !== 'DOWN';
  const image = facility.images[0] ?? facility.logoUrl;
  return (
    <Card className="flex h-full flex-col overflow-hidden p-0">
      <div className="bg-muted relative flex h-44 items-center justify-center overflow-hidden">
        {image ? (
          <Image src={image} alt={`Hình ảnh ${facility.name}`} fill unoptimized className="object-cover" />
        ) : (
          <span className="text-ink-navy text-5xl font-bold" aria-hidden>
            {facility.name.slice(0, 1)}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <div className="flex flex-wrap gap-2">
          <Badge>{TYPE_LABELS[facility.type] ?? 'Cơ sở y tế'}</Badge>
          {!bookable && (
            <Badge tone="warning">
              <WifiOff className="size-3" aria-hidden /> Tạm ngưng đặt khám online
            </Badge>
          )}
        </div>
        <h2 className="text-ink-navy mt-4 text-xl leading-snug font-semibold">
          <Link href={`/co-so/${encodeURIComponent(facility.slug)}`} className="hover:underline">
            {facility.name}
          </Link>
        </h2>
        <p className="text-slate-gray mt-3 flex gap-2 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden /> {facility.address}
        </p>
        <p className="text-slate-gray mt-3 flex items-center gap-2 text-sm">
          <Star className="text-warning size-4" aria-hidden />
          {facility.rating === null
            ? 'Chưa có đánh giá'
            : `${facility.rating.toFixed(1)} · ${facility.reviewCount} đánh giá`}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-6">
          <Button asChild variant="outline" size="sm">
            <Link href={`/co-so/${encodeURIComponent(facility.slug)}`}>
              Xem chi tiết <ArrowRight aria-hidden />
            </Link>
          </Button>
          {bookable && (
            <Button asChild size="sm">
              <Link href={`/dat-kham?co-so=${encodeURIComponent(facility.code)}`}>Đặt khám</Link>
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
