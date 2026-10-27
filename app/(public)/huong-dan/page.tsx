import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CircleHelp, ClipboardCheck, ReceiptText, RotateCcw } from 'lucide-react';
import { FaqList } from '@/components/features/content/faq-list';
import { GuideNav } from '@/components/features/content/guide-nav';
import { JsonLd } from '@/components/features/content/json-ld';
import { SupportOptions } from '@/components/features/content/support-options';
import { IconTile } from '@/components/ui/icon-tile';
import { blocksToPlainText } from '@/lib/domain/content/plain-text';
import { getContentService, getSupportLinks } from '@/lib/services/content';

export const revalidate = 60;
export const metadata: Metadata = {
  title: 'Hướng dẫn & câu hỏi thường gặp',
  description: 'Hướng dẫn đặt khám, tra cứu hồ sơ, hủy phiếu và hoàn phí tại MQ Solutions.',
  alternates: { canonical: '/huong-dan' },
};

export default async function Page() {
  const service = getContentService();
  const [pages, faqs] = await Promise.all([service.guidePages(), service.faqs()]);
  return (
    <main className="container-page py-12 md:py-16">
      {faqs.length > 0 && (
        <JsonLd
          data={{
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: blocksToPlainText(faq.blocks) },
            })),
          }}
        />
      )}
      <header className="mb-10 max-w-3xl">
        <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">Đồng hành cùng bạn</p>
        <h1 className="text-display-responsive">Hướng dẫn & hỗ trợ</h1>
        <p className="text-slate-gray mt-4 text-[18px] leading-7">
          Tìm hiểu từng bước đặt khám, tra cứu hồ sơ và xử lý các tình huống thường gặp.
        </p>
      </header>
      <Image
        src="/images/minh-hoa/sanh-benh-vien.webp"
        alt="Minh họa: Sảnh bệnh viện có nhân viên hướng dẫn người bệnh tại kiosk."
        width={1376}
        height={513}
        loading="lazy"
        sizes="(min-width: 1200px) 1200px, 100vw"
        className="mb-10 h-[200px] w-full rounded-2xl object-cover md:h-[320px]"
      />
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <GuideNav pages={pages} />
        <div className="space-y-10">
          {(pages.length > 0 || faqs.length > 0) && (
            <section>
              <h2 className="section-title mb-6">Các hướng dẫn</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {pages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/huong-dan/${page.slug.replace(/^huong-dan-/, '')}`}
                    className="border-hairline bg-paper group flex min-h-32 gap-4 rounded-xl border p-5 shadow-sm hover:shadow-md"
                  >
                    <IconTile>
                      {/huy/.test(page.slug) ? (
                        <RotateCcw aria-hidden />
                      ) : /hoan/.test(page.slug) ? (
                        <ReceiptText aria-hidden />
                      ) : /di-kham|quy-trinh/.test(page.slug) ? (
                        <ClipboardCheck aria-hidden />
                      ) : (
                        <CalendarDays aria-hidden />
                      )}
                    </IconTile>
                    <span className="text-ink-navy text-[22px] leading-snug font-bold">
                      {page.title}
                      <ArrowRight className="text-primary mt-2 size-4" aria-hidden />
                    </span>
                  </Link>
                ))}
                {faqs.length > 0 && (
                  <Link
                    href="/huong-dan/cau-hoi-thuong-gap"
                    className="border-hairline bg-paper group flex min-h-32 gap-4 rounded-xl border p-5 shadow-sm hover:shadow-md"
                  >
                    <IconTile>
                      <CircleHelp aria-hidden />
                    </IconTile>
                    <span className="text-ink-navy text-[22px] leading-snug font-bold">
                      Câu hỏi thường gặp
                      <ArrowRight className="text-primary mt-2 size-4" aria-hidden />
                    </span>
                  </Link>
                )}
              </div>
            </section>
          )}
          {faqs.length > 0 && <FaqList items={faqs} />}
          <SupportOptions {...getSupportLinks()} />
        </div>
      </div>
    </main>
  );
}
