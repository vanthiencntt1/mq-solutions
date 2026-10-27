import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileHeart,
  Stethoscope,
  Ticket,
  UserRound,
} from 'lucide-react';
import { SpecialtyIcon } from '@/components/features/specialty/specialty-icon';
import { IconTile } from '@/components/ui/icon-tile';
import { Stat } from '@/components/ui/stat';
import { BookingWidget } from './booking-widget';
import type { HomeFacility, HomeStatsData } from './types';

export interface SectionData {
  title?: string;
  description?: string;
  items?: { label?: string; value?: string; title?: string; quote?: string; name?: string; href?: string }[];
}

const ICON_DIR = '/images/icons/bat-dau';

const entries = [
  { href: '/co-so-y-te', label: 'Theo bệnh viện', hint: 'Tìm cơ sở gần bạn', icon: Building2, image: `${ICON_DIR}/benh-vien.webp` },
  { href: '/chuyen-khoa', label: 'Theo chuyên khoa', hint: 'Chọn khoa cần khám', icon: Stethoscope, image: `${ICON_DIR}/chuyen-khoa.webp` },
  { href: '/bac-si', label: 'Theo bác sĩ', hint: 'Tìm bác sĩ phù hợp', icon: UserRound, image: `${ICON_DIR}/bac-si.webp` },
  { href: '/tai-khoan/co-so', label: 'Tra cứu hồ sơ', hint: 'Xem kết quả và đơn thuốc', icon: FileHeart, image: `${ICON_DIR}/ho-so.webp` },
  { href: '/tai-khoan/phieu-kham', label: 'Phiếu khám của tôi', hint: 'Xem lịch và số thứ tự', icon: Ticket, image: `${ICON_DIR}/phieu-kham.webp` },
];

export const steps = [
  { title: 'Chọn bệnh viện', description: 'Chọn nơi bạn muốn đến khám.', icon: Building2 },
  { title: 'Chọn giờ khám', description: 'Xem lịch và chọn giờ phù hợp.', icon: CalendarDays },
  { title: 'Xác nhận thông tin', description: 'Kiểm tra thông tin trước khi đặt.', icon: ClipboardList },
  { title: 'Nhận phiếu khám', description: 'Xem số thứ tự trên điện thoại.', icon: Ticket },
];

export const faqs = [
  {
    question: 'Tôi có cần tạo tài khoản trước khi chọn lịch?',
    answer: 'Bạn có thể chọn bệnh viện và giờ khám trước. Hệ thống sẽ đề nghị đăng nhập khi cần xác nhận.',
  },
  {
    question: 'Tôi xem phiếu khám đã đặt ở đâu?',
    answer: 'Sau khi đăng nhập, mở mục Phiếu khám của tôi để xem số thứ tự, giờ khám và trạng thái phiếu.',
  },
  {
    question: 'Nếu cần đổi hoặc hủy lịch thì sao?',
    answer: 'Mở phiếu khám để xem thao tác có sẵn, hoặc gọi tổng đài để được hỗ trợ.',
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
    <section aria-labelledby="home-title" className="bg-paper relative isolate overflow-hidden">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-b-2xl lg:hidden">
        <Image
          src="/images/minh-hoa/banner-trang-chu-mobile.webp"
          alt="Minh họa: người bệnh được nhân viên hướng dẫn dùng kiosk tại sảnh bệnh viện"
          fill
          priority
          sizes="100vw"
          className="object-cover object-center"
        />
        <span className="bg-paper/90 text-slate-gray absolute right-4 bottom-4 rounded-full px-3 py-1 text-xs font-medium">
          Ảnh minh họa
        </span>
      </div>
      {/* Ảnh chỉ chiếm phần phải; mép trái mờ dần vào nền trắng nên màn rộng không lộ dải lệch màu */}
      <div className="absolute inset-y-0 right-0 hidden w-[62%] lg:block">
        <Image
          src="/images/minh-hoa/banner-trang-chu.webp"
          alt="Minh họa: người bệnh được nhân viên hướng dẫn dùng kiosk tại sảnh bệnh viện"
          fill
          priority
          sizes="62vw"
          className="object-cover object-[75%_center]"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 38%)',
          }}
        />
        <span className="bg-paper/90 text-slate-gray absolute right-6 bottom-5 rounded-full px-3 py-1 text-xs font-medium">
          Ảnh minh họa
        </span>
      </div>
      <div className="container-page relative z-10 py-10 md:py-12 lg:flex lg:min-h-[620px] lg:items-center">
        <div className="max-w-[600px] min-w-0">
          <h1
            id="home-title"
            className="text-ink-navy text-[42px] leading-[1.12] font-bold md:text-[48px] lg:text-[56px] xl:text-[60px]"
          >
            {data.title || 'Đặt lịch khám bệnh viện, nhận số thứ tự ngay trên điện thoại'}
          </h1>
          <p className="text-slate-gray mt-5 max-w-[560px] text-lg leading-relaxed xl:text-xl">
            {data.description ||
              'Chọn bệnh viện và giờ khám phù hợp. Phiếu khám được lưu trên điện thoại để bạn dễ xem khi đến viện.'}
          </p>
          <div className="mt-6">
            <BookingWidget facilities={facilities} loadError={loadError} />
          </div>
          <ul className="text-slate-gray mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[
              'Không xếp hàng lấy số',
              facilities.some((facility) => facility.allowOnlinePayment)
                ? 'Thanh toán online khi cơ sở hỗ trợ'
                : 'Xem chi phí trước khi đặt',
              'Hồ sơ khám ở một nơi',
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="text-primary size-4" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export function HomePartners({ facilities, data = {} }: { facilities: HomeFacility[]; data?: SectionData }) {
  if (!facilities.length) return null;
  return (
    <section className="border-hairline border-y" aria-label="Bệnh viện đang nhận đặt khám">
      <div className="container-page py-8 text-center">
        <p className="text-slate-gray text-sm font-semibold">{data.title || 'Đang nhận đặt khám tại'}</p>
        {data.description && <p className="text-slate-gray mt-2 text-sm">{data.description}</p>}
        <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-9 gap-y-5">
          {facilities.map((facility) => (
            <li key={facility.code}>
              <Link
                href={`/co-so/${facility.slug}`}
                className="text-ink-navy group hover:text-primary inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold"
              >
                {facility.logoUrl ? (
                  <Image
                    src={facility.logoUrl}
                    alt=""
                    width={40}
                    height={40}
                    unoptimized
                    className="size-10 object-contain opacity-70 grayscale group-hover:opacity-100 group-hover:grayscale-0"
                  />
                ) : (
                  <Building2 className="text-primary size-6" aria-hidden />
                )}
                <span className="max-w-40 text-left leading-snug">{facility.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HomeServices({ data }: { data: SectionData }) {
  const cms =
    data.items?.flatMap((item) => {
      if (!item.label || !item.href) return [];
      const match = entries.find((entry) => entry.href === item.href);
      return [
        {
          href: item.href,
          label: item.label,
          hint: item.title || '',
          icon: match?.icon ?? Stethoscope,
          image: match?.image,
        },
      ];
    }) ?? [];
  return (
    <section
      className="container-page py-12 md:py-16"
      aria-label={data.title || 'Bắt đầu từ nhu cầu của bạn'}
    >
      <div className="mb-8">
        <h2 className="section-title">{data.title || 'Bạn muốn bắt đầu từ đâu?'}</h2>
        {data.description && <p className="text-slate-gray mt-3">{data.description}</p>}
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(cms.length ? cms : entries).map(({ href, label, hint, icon: Icon, image }) => (
          <li key={`${href}:${label}`}>
            <Link
              href={href}
              className="border-hairline bg-card group hover:border-primary focus-visible:ring-primary/30 flex h-full min-h-40 flex-col rounded-xl border p-5 shadow-sm focus-visible:ring-3"
            >
              {image ? (
                <Image
                  src={image}
                  alt=""
                  width={72}
                  height={72}
                  className="size-18 object-contain transition-transform duration-200 group-hover:-translate-y-0.5"
                />
              ) : (
                <IconTile>
                  <Icon aria-hidden />
                </IconTile>
              )}
              <span className="text-ink-navy mt-4 flex items-center justify-between gap-2 text-base font-bold">
                {label}
                <ChevronRight className="text-primary size-4 shrink-0" aria-hidden />
              </span>
              {hint && <span className="text-slate-gray mt-1 text-sm">{hint}</span>}
            </Link>
          </li>
        ))}
      </ul>
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
    <section className="bg-cloud" aria-labelledby="home-specialties-title">
      <div className="container-page py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="home-specialties-title" className="section-title">
              {data.title || 'Tìm khám theo chuyên khoa'}
            </h2>
            <p className="text-slate-gray mt-3 max-w-2xl">
              {data.description || 'Xem những bệnh viện đang có chuyên khoa bạn cần.'}
            </p>
          </div>
          <Link
            href="/chuyen-khoa"
            className="text-primary inline-flex min-h-11 items-center gap-1 font-semibold hover:underline"
          >
            Tất cả chuyên khoa <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {groups.slice(0, 8).map((group) => (
            <li key={group.slug}>
              <Link
                href={`/chuyen-khoa/${encodeURIComponent(group.slug)}`}
                className="border-hairline bg-paper hover:border-primary flex min-h-24 items-center gap-4 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="bg-pebble flex size-14 shrink-0 items-center justify-center rounded-2xl md:size-16">
                  <SpecialtyIcon name={group.name} size="lg" className="size-14 md:size-16" />
                </span>
                <span className="min-w-0">
                  <span className="text-ink-navy block font-bold">{group.name}</span>
                  <span className="text-slate-gray text-sm">{group.count} bệnh viện</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function HomeStats({
  data,
  facilityCount,
  stats,
}: {
  data: SectionData;
  facilityCount: number;
  stats?: HomeStatsData;
}) {
  const cms =
    data.items?.flatMap((item) =>
      item.label && item.value ? [{ label: item.label, value: item.value }] : [],
    ) ?? [];
  const items = cms.length
    ? cms
    : [
        ...(stats?.facilityCount || facilityCount
          ? [{ label: 'Bệnh viện nhận đặt khám', value: stats?.facilityCount ?? facilityCount }]
          : []),
        ...(stats?.specialtyCount ? [{ label: 'Chuyên khoa', value: stats.specialtyCount }] : []),
        ...(stats?.doctorCount !== undefined ? [{ label: 'Bác sĩ', value: stats.doctorCount }] : []),
      ];
  if (!items.length) return null;
  return (
    <section className="bg-info-bg" aria-label={data.title || 'Số liệu hệ thống'}>
      <div className="container-page py-10 md:py-12">
        {data.title && <h2 className="section-title mb-7">{data.title}</h2>}
        <div className="grid gap-7 sm:grid-cols-3">
          {items.slice(0, 4).map((item) => (
            <Stat key={item.label} value={item.value} label={item.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
