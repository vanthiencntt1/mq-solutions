import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  ChevronDown,
  ClipboardList,
  Clock3,
  FileText,
  Mail,
  MessageCircle,
  Phone,
  Pill,
  ScanLine,
  Star,
  Ticket,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IconTile } from '@/components/ui/icon-tile';
import { ProductFrame } from '@/components/ui/product-frame';
import type { SiteReview } from '@/lib/domain/ports';
import { faqs, steps, type SectionData } from './home-sections';
import { QrGlyph } from './mockup-parts';

export function HomeTestimonials({ data, reviews }: { data: SectionData; reviews: SiteReview[] }) {
  const cms =
    data.items?.flatMap((item) =>
      item.quote && item.name
        ? [
            {
              id: `${item.name}:${item.quote}`,
              comment: item.quote,
              name: item.name
                .trim()
                .split(/\s+/)
                .map((part) => `${part[0]?.toLocaleUpperCase('vi') ?? ''}.`)
                .join(' '),
              rating: undefined,
            },
          ]
        : [],
    ) ?? [];
  const quotes = cms.length
    ? cms
    : reviews.map((review) => ({
        id: review.id,
        comment: review.comment,
        name: 'Người bệnh',
        rating: review.rating,
      }));
  if (!quotes.length) return null;
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="home-reviews-title">
      <h2 id="home-reviews-title" className="section-title">
        {data.title || 'Đánh giá từ người bệnh'}
      </h2>
      {data.description && <p className="text-slate-gray mt-3">{data.description}</p>}
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {quotes.slice(0, 3).map((quote) => (
          <figure key={quote.id} className="border-hairline bg-card rounded-2xl border p-6 shadow-sm">
            {quote.rating !== undefined && (
              <div className="text-primary mb-4 flex gap-1" aria-label={`${quote.rating} trên 5 sao`}>
                {Array.from({ length: 5 }, (_, index) => (
                  <Star
                    key={index}
                    className="size-4"
                    fill={index < quote.rating ? 'currentColor' : 'none'}
                    aria-hidden
                  />
                ))}
              </div>
            )}
            <blockquote className="text-ink-navy leading-relaxed">“{quote.comment}”</blockquote>
            <figcaption className="text-slate-gray mt-5 text-sm font-semibold">{quote.name}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

export function HomeSteps({ data = {} }: { data?: SectionData }) {
  const visibleSteps = steps.map((step, index) => ({
    ...step,
    title: data.items?.[index]?.title || step.title,
    description: data.items?.[index]?.label || step.description,
  }));
  return (
    <section className="bg-paper" aria-labelledby="steps-title">
      <div className="container-page py-12 md:py-16">
        <h2 id="steps-title" className="section-title">
          {data.title || 'Bốn bước để có phiếu khám'}
        </h2>
        {data.description && <p className="text-slate-gray mt-3">{data.description}</p>}
        <Image
          src="/images/minh-hoa/sanh-benh-vien.webp"
          alt="Minh họa: Sảnh bệnh viện có nhân viên hướng dẫn người bệnh tại kiosk."
          width={1376}
          height={513}
          loading="lazy"
          sizes="(min-width: 1200px) 1200px, 100vw"
          className="mt-8 h-[200px] w-full rounded-2xl object-cover md:h-[320px]"
        />
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {visibleSteps.map((step, index) => (
            <li key={step.title} className="border-hairline bg-cloud relative rounded-2xl border p-5 md:p-6">
              {index < steps.length - 1 && (
                <span
                  className="bg-hairline absolute top-11 -right-4 z-10 hidden h-px w-4 md:block"
                  aria-hidden
                />
              )}
              <div className="flex items-center justify-between">
                <IconTile>
                  <step.icon aria-hidden />
                </IconTile>
                <span className="text-primary tabular text-3xl font-bold">0{index + 1}</span>
              </div>
              <h3 className="text-ink-navy mt-5 text-[22px] font-bold">{step.title}</h3>
              <p className="text-slate-gray mt-2 text-sm leading-relaxed">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function SlotsMockup() {
  return (
    <div className="p-5 sm:p-7">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-slate-gray text-xs">Chọn giờ khám</p>
          <p className="text-ink-navy mt-1 font-bold">Lịch còn chỗ</p>
        </div>
        <IconTile size="sm">
          <Clock3 aria-hidden />
        </IconTile>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2">
        {['07:00', '07:30', '08:00', '08:30', '09:00', '09:30'].map((time, index) => (
          <span
            key={time}
            className={`rounded-md border px-2 py-3 text-center text-sm font-semibold ${index === 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-hairline bg-cloud text-ink-navy'}`}
          >
            {time}
          </span>
        ))}
      </div>
      <p className="text-slate-gray mt-5 text-xs">Giờ khám được cập nhật khi bạn đặt lịch.</p>
    </div>
  );
}

function TicketMockup() {
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-slate-gray text-sm">Phiếu khám điện tử</p>
          <p className="text-ink-navy mt-2 text-[24px] font-bold">
            Số thứ tự <span className="text-primary tabular text-[48px]">12</span>
          </p>
        </div>
        <IconTile size="sm">
          <Ticket aria-hidden />
        </IconTile>
      </div>
      <div className="border-hairline mt-5 flex items-end justify-between gap-4 border-t pt-5">
        <dl className="text-sm">
          <dt className="text-slate-gray">Giờ khám</dt>
          <dd className="text-ink-navy mt-1 font-bold">07:00</dd>
          <dt className="text-slate-gray mt-3">Phòng khám</dt>
          <dd className="text-ink-navy mt-1 font-bold">Phòng Nội 1</dd>
        </dl>
        <QrGlyph />
      </div>
    </div>
  );
}

function RecordsMockup() {
  const records = [
    { label: 'Kết quả xét nghiệm', icon: ClipboardList },
    { label: 'Chẩn đoán hình ảnh', icon: ScanLine },
    { label: 'Đơn thuốc', icon: Pill },
  ];
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <IconTile size="sm">
          <FileText aria-hidden />
        </IconTile>
        <div>
          <p className="text-slate-gray text-xs">Hồ sơ của tôi</p>
          <p className="text-ink-navy font-bold">Kết quả khám</p>
        </div>
      </div>
      <ul className="mt-6 space-y-3">
        {records.map((record) => (
          <li
            key={record.label}
            className="border-hairline bg-cloud flex items-center gap-3 rounded-lg border p-3"
          >
            <record.icon className="text-primary size-5" strokeWidth={1.75} aria-hidden />
            <span className="text-ink-navy flex-1 text-sm font-semibold">{record.label}</span>
            <ArrowRight className="text-primary size-4" aria-hidden />
          </li>
        ))}
      </ul>
    </div>
  );
}

const benefits = [
  {
    title: 'Xem lịch còn trống theo từng giờ',
    description: 'Chọn giờ phù hợp trước khi đến bệnh viện.',
    points: [
      'Xem ngày và giờ đang mở đặt khám',
      'Chọn chuyên khoa và khung giờ',
      'Kiểm tra thông tin trước khi xác nhận',
    ],
    mockup: SlotsMockup,
  },
  {
    title: 'Số thứ tự và mã QR có ngay',
    description: 'Thông tin phiếu khám nằm ngay trên điện thoại của bạn.',
    points: ['Xem số thứ tự đã đặt', 'Mở mã QR khi đến quầy', 'Xem lại giờ và phòng khám'],
    mockup: TicketMockup,
  },
  {
    title: 'Kết quả khám ở một nơi',
    description: 'Tìm lại thông tin khám bệnh khi bạn cần.',
    points: ['Xem kết quả xét nghiệm', 'Mở chẩn đoán hình ảnh', 'Xem đơn thuốc đã có'],
    mockup: RecordsMockup,
  },
];

export function HomeBenefits({ data = {} }: { data?: SectionData }) {
  return (
    <section aria-label="Tiện ích đặt khám">
      {(data.title || data.description) && (
        <div className="container-page pt-12 md:pt-16">
          {data.title && <h2 className="section-title">{data.title}</h2>}
          {data.description && <p className="text-slate-gray mt-3">{data.description}</p>}
        </div>
      )}
      {benefits.map((benefit, index) => (
        <div key={benefit.title} className={index === 1 ? 'bg-paper' : ''}>
          <div
            className={`container-page grid min-w-0 items-center gap-9 py-12 md:py-16 lg:grid-cols-2 lg:gap-16 ${index === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}
          >
            <div>
              <h2 className="section-title">{data.items?.[index]?.title || benefit.title}</h2>
              <p className="text-slate-gray mt-4 text-lg">
                {data.items?.[index]?.label || benefit.description}
              </p>
              <ul className="mt-6 space-y-3">
                {benefit.points.map((point) => (
                  <li key={point} className="text-ink-navy flex gap-2">
                    <Check className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
            {index === 2 ? (
              <div className="relative isolate min-w-0 lg:min-h-[470px]">
                <Image
                  src="/images/minh-hoa/bac-si-nguoi-benh.webp"
                  alt="Minh họa: Bác sĩ xem kết quả khám cùng người bệnh lớn tuổi."
                  width={560}
                  height={673}
                  loading="lazy"
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 560px, 100vw"
                  className="h-72 w-full rounded-2xl object-cover sm:h-[360px] lg:h-[430px] lg:w-[70%]"
                />
                <ProductFrame
                  className="relative z-10 mt-5 lg:absolute lg:right-0 lg:bottom-0 lg:mt-0 lg:w-[70%]"
                  caption="Minh họa"
                >
                  <benefit.mockup />
                </ProductFrame>
              </div>
            ) : (
              <ProductFrame caption="Minh họa">
                <benefit.mockup />
              </ProductFrame>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

export function HomeFaq({ data = {} }: { data?: SectionData }) {
  const cms =
    data.items?.flatMap((item) =>
      item.title && item.value ? [{ question: item.title, answer: item.value }] : [],
    ) ?? [];
  const questions = cms.length ? cms : faqs;
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="faq-title">
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14">
        <div>
          <h2 id="faq-title" className="section-title">
            {data.title || 'Câu hỏi thường gặp'}
          </h2>
          <p className="text-slate-gray mt-3">
            {data.description || 'Tìm câu trả lời nhanh trước khi đặt khám.'}
          </p>
          <Link
            href="/huong-dan"
            className="text-primary mt-5 inline-flex min-h-11 items-center gap-1 font-semibold hover:underline"
          >
            Hướng dẫn đặt khám <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div className="border-hairline border-t">
          {questions.map((item) => (
            <details key={item.question} className="border-hairline group border-b">
              <summary className="text-ink-navy flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                <span>{item.question}</span>
                <ChevronDown className="text-primary size-5 shrink-0 group-open:rotate-180" aria-hidden />
              </summary>
              <p className="text-slate-gray max-w-prose pb-5 leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeSupport({
  hotline,
  email,
  zaloUrl,
  facebookUrl,
  data = {},
}: {
  hotline: string;
  email: string;
  zaloUrl: string;
  facebookUrl: string;
  data?: SectionData;
}) {
  const others = [
    { label: 'Gửi email', href: `mailto:${email}`, icon: Mail, external: false },
    ...(zaloUrl ? [{ label: 'Nhắn Zalo', href: zaloUrl, icon: MessageCircle, external: true }] : []),
    ...(facebookUrl
      ? [{ label: 'Nhắn Facebook', href: facebookUrl, icon: MessageCircle, external: true }]
      : []),
  ];
  return (
    <section className="container-page py-12 md:py-16" aria-labelledby="home-support-title">
      <div className="border-hairline grid gap-6 border-t pt-10 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 id="home-support-title" className="section-title">
            {data.title || 'Cần hỗ trợ đặt khám?'}
          </h2>
          <p className="text-slate-gray mt-3 max-w-md">
            {data.description || 'Gọi tổng đài nếu bạn cần người hướng dẫn chọn lịch khám.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {hotline && (
            <a
              href={`tel:${hotline.replace(/\s/g, '')}`}
              className="text-ink-navy tabular inline-flex min-h-12 items-center gap-2 text-2xl font-bold hover:underline"
            >
              <Phone className="text-primary size-6" aria-hidden />
              {hotline}
            </a>
          )}
          {others.map((item) => (
            <a
              key={item.label}
              href={item.href}
              {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              className="border-hairline bg-card text-ink-navy hover:border-primary inline-flex min-h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold"
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeCta({ hotline, data = {} }: { hotline?: string; data?: SectionData }) {
  return (
    <section className="container-page pb-12 md:pb-16" aria-labelledby="home-cta-title">
      <div className="bg-ink-navy flex flex-col items-start justify-between gap-8 rounded-2xl px-6 py-10 md:flex-row md:items-center md:px-12 md:py-12">
        <div>
          <h2 id="home-cta-title" className="md:text-heading text-paper text-[38px] leading-tight font-bold">
            {data.title || 'Sẵn sàng đặt lịch khám?'}
          </h2>
          <p className="text-paper/80 mt-3 max-w-xl">
            {data.description || 'Chọn bệnh viện, xem lịch và đặt giờ phù hợp với bạn.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/dat-kham">Đặt khám</Link>
          </Button>
          {hotline && (
            <a
              href={`tel:${hotline.replace(/\s/g, '')}`}
              className="border-paper text-paper hover:bg-paper/10 inline-flex min-h-12 items-center justify-center rounded-md border px-5 text-lg font-semibold"
            >
              <Phone className="mr-2 size-5" aria-hidden />
              Gọi tổng đài
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
