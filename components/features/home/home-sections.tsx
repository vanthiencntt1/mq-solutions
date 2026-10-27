import Link from 'next/link';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileHeart,
  HeartHandshake,
  ShieldCheck,
  Stethoscope,
  Ticket,
  UserRoundCheck,
} from 'lucide-react';
import { BookingWidget } from './booking-widget';
import { SearchBox } from '@/components/features/search/search-box';
import type { HomeFacility } from './types';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export interface SectionData {
  title?: string;
  description?: string;
  items?: { label?: string; value?: string; title?: string; quote?: string; name?: string; href?: string }[];
}

const entries = [
  { href: '/co-so-y-te', label: 'Đặt khám tại cơ sở', icon: Stethoscope },
  { href: '/chuyen-khoa', label: 'Theo chuyên khoa', icon: HeartHandshake },
  { href: '/bac-si', label: 'Theo bác sĩ', icon: UserRoundCheck },
  { href: '/tai-khoan/co-so', label: 'Tra cứu hồ sơ', icon: FileHeart },
  { href: '/tai-khoan/phieu-kham', label: 'Phiếu khám của tôi', icon: Ticket },
];
export const steps = [
  { title: 'Chọn cơ sở', description: 'Tìm bệnh viện hoặc phòng khám phù hợp.', icon: Stethoscope },
  { title: 'Chọn lịch khám', description: 'Xem chuyên khoa, bác sĩ và giờ còn trống.', icon: CalendarDays },
  { title: 'Xác nhận thông tin', description: 'Kiểm tra lại thông tin trước khi đặt.', icon: UserRoundCheck },
  { title: 'Nhận phiếu khám', description: 'Lưu phiếu để dùng khi đến cơ sở y tế.', icon: Ticket },
];
export const benefits = [
  {
    title: 'Chủ động thời gian',
    description: 'Xem lịch và chọn giờ khám phù hợp ngay trên điện thoại.',
    icon: Clock3,
  },
  {
    title: 'Thông tin rõ ràng',
    description: 'Biết cơ sở, chuyên khoa và lịch trước khi xác nhận.',
    icon: CheckCircle2,
  },
  {
    title: 'Một nơi để theo dõi',
    description: 'Xem lại phiếu và hồ sơ tại các cơ sở đã liên kết.',
    icon: ShieldCheck,
  },
];
export const faqs = [
  {
    question: 'Tôi có cần tạo tài khoản trước khi chọn lịch?',
    answer: 'Bạn có thể bắt đầu chọn cơ sở và lịch khám. Hệ thống sẽ hướng dẫn đăng nhập khi cần xác nhận.',
  },
  {
    question: 'Tôi xem phiếu khám đã đặt ở đâu?',
    answer: 'Sau khi đăng nhập, mở mục Phiếu khám của tôi để xem lịch đã đặt và trạng thái phiếu.',
  },
  {
    question: 'Nếu cần đổi hoặc hủy lịch thì sao?',
    answer: 'Mở phiếu khám để xem lựa chọn theo quy định của cơ sở, hoặc liên hệ hotline.',
  },
];

export function HomeHero({
  data,
  facilities,
  loadError,
}: {
  data: SectionData;
  facilities: HomeFacility[];
  loadError: boolean;
}) {
  return (
    <section className="relative overflow-hidden" aria-labelledby="home-title">
      <div className="container-page grid items-center gap-12 py-12 md:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div>
          <Badge tone="info">Một tài khoản · Nhiều cơ sở y tế</Badge>
          <h1
            id="home-title"
            className="text-ink-navy mt-6 text-[38px] leading-[1.18] font-bold md:text-[68px]"
          >
            {data.title || (
              <>
                Đặt khám dễ dàng, <span className="text-primary">chủ động</span> hành trình chăm sóc sức khỏe
              </>
            )}
          </h1>
          <p className="text-slate-gray mt-6 max-w-xl text-[18px] leading-normal md:text-[20px]">
            {data.description ||
              'Kết nối bạn với cơ sở y tế. Chọn nơi khám, xem lịch và nhận phiếu khám trong vài bước rõ ràng.'}
          </p>
          <div className="mt-8 max-w-xl">
            <SearchBox />
          </div>
          <ul className="text-slate-gray mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {['Chọn lịch chủ động', 'Theo dõi phiếu dễ dàng', 'Nhiều cơ sở trong một tài khoản'].map(
              (label) => (
                <li key={label} className="flex items-center gap-2">
                  <CheckCircle2 className="text-success size-4" aria-hidden />
                  {label}
                </li>
              ),
            )}
          </ul>
        </div>
        <div className="relative isolate">
          <div
            className="bg-coral-magenta/20 absolute -top-6 -right-5 -z-10 size-40 rounded-full blur-2xl md:size-56"
            aria-hidden
          />
          <div
            className="bg-sky-cyan/20 absolute -bottom-8 -left-5 -z-10 size-44 rounded-full blur-2xl md:size-64"
            aria-hidden
          />
          <BookingWidget facilities={facilities} loadError={loadError} />
        </div>
      </div>
    </section>
  );
}

export function HomeServices({ data }: { data: SectionData }) {
  const links =
    data.items?.flatMap((item) =>
      item.label && item.href ? [{ href: item.href, label: item.label, icon: Stethoscope }] : [],
    ) ?? [];
  return (
    <section className="container-page py-6" aria-label="Lối vào dịch vụ">
      {data.title && <h2 className="mb-5 text-[26px] md:text-[38px]">{data.title}</h2>}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        {(links.length ? links : entries).map(({ href, label, icon: Icon }) => (
          <li key={`${href}:${label}`}>
            <Link
              href={href}
              className="border-border bg-card text-ink-navy flex h-full min-h-32 flex-col items-start gap-4 rounded-xl border p-4 font-semibold shadow-sm transition-shadow hover:shadow-md md:p-6"
            >
              <Icon className="text-primary size-6" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomePartners({ facilities }: { facilities: HomeFacility[] }) {
  if (!facilities.length) return null;
  return (
    <section className="container-page py-10" aria-label="Cơ sở đồng hành">
      <p className="text-slate-gray mb-5 text-center text-sm font-semibold uppercase">Cơ sở y tế đồng hành</p>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {facilities.slice(0, 8).map((facility) => (
          <Link
            key={facility.code}
            href={`/co-so/${facility.slug}`}
            className="text-slate-gray hover:text-ink-navy text-sm font-semibold"
          >
            {facility.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeSpecialties({
  data,
  groups,
}: {
  data: SectionData;
  groups: { slug: string; name: string; count: number }[];
}) {
  if (!groups.length) return null;
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="home-specialties-title">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="text-info text-sm font-semibold">KHÁM THEO NHU CẦU</p>
          <h2 id="home-specialties-title" className="mt-2 text-[26px] md:text-[38px]">
            {data.title || 'Chọn chuyên khoa'}
          </h2>
        </div>
        <Link
          href="/chuyen-khoa"
          className="text-ink-navy inline-flex min-h-11 items-center gap-2 font-semibold"
        >
          Xem tất cả <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {groups.slice(0, 8).map((group) => (
          <Link
            key={group.slug}
            href={`/chuyen-khoa/${encodeURIComponent(group.slug)}`}
            className="border-border bg-card hover:border-primary rounded-xl border p-4 shadow-sm"
          >
            <Stethoscope className="text-primary mb-3 size-6" aria-hidden />
            <h3 className="font-semibold">{group.name}</h3>
            <p className="text-slate-gray mt-1 text-sm">{group.count} cơ sở</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function HomeStats({ data, facilityCount }: { data: SectionData; facilityCount: number }) {
  const stats =
    data.items?.flatMap((item) =>
      item.label && item.value ? [{ label: item.label, value: item.value }] : [],
    ) ?? [];
  const shown = stats.length ? stats : [{ label: 'Cơ sở y tế đồng hành', value: String(facilityCount) }];
  return (
    <section className="bg-paper py-12" aria-labelledby="home-stats-title">
      <div className="container-page">
        <h2 id="home-stats-title" className="mb-7 text-center text-[26px] md:text-[38px]">
          {data.title || 'MQ Solutions trong con số'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {shown.map((item) => (
            <Card key={item.label} className="text-center">
              <p className="text-primary text-3xl font-bold">{item.value}</p>
              <p className="text-slate-gray mt-2">{item.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
