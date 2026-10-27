import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { SiteReview } from '@/lib/domain/ports';
import { steps, benefits, faqs, type SectionData } from './home-sections';
export function HomeTestimonials({ data, reviews }: { data: SectionData; reviews: SiteReview[] }) {
  const edited =
    data.items?.flatMap((item) =>
      item.quote && item.name
        ? [
            {
              id: `${item.name}:${item.quote}`,
              comment: item.quote,
              name: item.name
                .trim()
                .split(/\s+/)
                .slice(0, 4)
                .map((part) => `${part[0]?.toLocaleUpperCase('vi') ?? ''}.`)
                .join(' '),
            },
          ]
        : [],
    ) ?? [];
  const quotes = edited.length
    ? edited
    : reviews.map((review) => ({ id: review.id, comment: review.comment, name: 'Người bệnh' }));
  if (!quotes.length) return null;
  return (
    <section className="bg-paper py-12 md:py-16" aria-labelledby="home-reviews-title">
      <div className="container-page">
        <p className="text-info text-center text-sm font-semibold">Ý KIẾN TỪ NGƯỜI BỆNH</p>
        <h2 id="home-reviews-title" className="mt-2 text-center text-[26px] md:text-[38px]">
          {data.title || 'Cảm nhận của người bệnh'}
        </h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {quotes.slice(0, 3).map((quote) => (
            <Card key={quote.id}>
              <p className="text-primary mb-3 text-3xl" aria-hidden>
                “
              </p>
              <blockquote className="text-ink-navy leading-relaxed">{quote.comment}</blockquote>
              <p className="text-slate-gray mt-5 text-sm font-semibold">{quote.name}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HomeSteps() {
  return (
    <section className="bg-paper py-12 md:py-16" aria-labelledby="steps-title">
      <div className="container-page">
        <p className="text-info text-center text-sm font-semibold">QUY TRÌNH ĐƠN GIẢN</p>
        <h2 id="steps-title" className="mt-2 text-center text-[26px] md:text-[38px]">
          Bốn bước để có lịch khám
        </h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full p-5">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-info text-sm font-semibold">BƯỚC {index + 1}</span>
                  <step.icon className="text-primary size-6" aria-hidden />
                </div>
                <h3 className="text-[20px] font-semibold">{step.title}</h3>
                <p className="text-slate-gray mt-2 text-sm">{step.description}</p>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function HomeBenefits() {
  return (
    <section
      className="container-page grid items-center gap-10 py-12 md:grid-cols-[0.8fr_1.2fr] md:py-16"
      aria-labelledby="benefits-title"
    >
      <div>
        <p className="text-info mb-2 text-sm font-semibold">DÀNH CHO BẠN</p>
        <h2 id="benefits-title" className="text-[26px] leading-tight md:text-[38px]">
          Chăm sóc sức khỏe bắt đầu từ một lịch hẹn thuận tiện
        </h2>
        <p className="text-slate-gray mt-4">
          Các thông tin cần thiết được đặt cùng một nơi để bạn dễ chuẩn bị cho buổi khám.
        </p>
      </div>
      <div className="space-y-3">
        {benefits.map((benefit) => (
          <div
            key={benefit.title}
            className="border-border bg-card flex gap-4 rounded-xl border p-5 shadow-sm"
          >
            <benefit.icon className="text-primary mt-1 size-6 shrink-0" aria-hidden />
            <div>
              <h3 className="text-[20px] font-semibold">{benefit.title}</h3>
              <p className="text-slate-gray mt-1 text-sm">{benefit.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function HomeFaq() {
  return (
    <section className="bg-paper py-12 md:py-16" aria-labelledby="faq-title">
      <div className="container-page grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-info mb-2 text-sm font-semibold">HỖ TRỢ</p>
          <h2 id="faq-title" className="text-[26px] md:text-[38px]">
            Câu hỏi thường gặp
          </h2>
          <Link
            href="/huong-dan"
            className="text-ink-navy mt-4 inline-flex min-h-11 items-center gap-2 font-semibold hover:underline"
          >
            Xem hướng dẫn <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <div>
          {faqs.map((item) => (
            <details key={item.question} className="border-border group border-b py-4">
              <summary className="text-ink-navy flex min-h-11 cursor-pointer items-center justify-between gap-4 font-semibold">
                <span>{item.question}</span>
                <span className="text-primary text-xl group-open:rotate-45" aria-hidden>
                  +
                </span>
              </summary>
              <p className="text-slate-gray pb-2 text-sm leading-relaxed">{item.answer}</p>
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
}: {
  hotline: string;
  email: string;
  zaloUrl: string;
  facebookUrl: string;
}) {
  return (
    <section className="container-page py-12" aria-labelledby="home-support-title">
      <h2 id="home-support-title" className="text-[26px] md:text-[38px]">
        Cần hỗ trợ đặt khám?
      </h2>
      <div className="mt-5 flex flex-wrap gap-4">
        <a href={`tel:${hotline.replace(/\s/g, '')}`} className="text-primary font-semibold">
          Gọi {hotline}
        </a>
        <a href={`mailto:${email}`} className="text-ink-navy font-semibold">
          Email hỗ trợ
        </a>
        {zaloUrl && (
          <a href={zaloUrl} target="_blank" rel="noopener noreferrer" className="text-ink-navy font-semibold">
            Zalo OA
          </a>
        )}
        {facebookUrl && (
          <a
            href={facebookUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-navy font-semibold"
          >
            Facebook
          </a>
        )}
      </div>
    </section>
  );
}

export function HomeCta() {
  return (
    <section className="container-page pb-4" aria-labelledby="home-cta-title">
      <div className="bg-ink-navy flex flex-col items-start justify-between gap-6 rounded-2xl p-6 text-white md:flex-row md:items-center md:p-10">
        <div>
          <h2 id="home-cta-title" className="text-[26px] font-bold text-white md:text-[38px]">
            Sẵn sàng đặt lịch khám?
          </h2>
          <p className="mt-2 max-w-xl text-white/80">
            Chọn cơ sở phù hợp và xem lịch khám còn trống ngay hôm nay.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dat-kham">
            Đặt khám ngay <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
    </section>
  );
}
