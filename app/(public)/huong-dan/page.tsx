import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { FaqList } from '@/components/features/content/faq-list';
import { GuideNav } from '@/components/features/content/guide-nav';
import { JsonLd } from '@/components/features/content/json-ld';
import { SupportOptions } from '@/components/features/content/support-options';
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
    <div className="container-page py-10 md:py-16">
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
      <header className="mb-10 max-w-3xl">
        <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">Đồng hành cùng bạn</p>
        <h1 className="text-[32px] md:text-[50px]">Hướng dẫn & hỗ trợ</h1>
        <p className="text-slate-gray mt-4 text-[18px] leading-7">
          Tìm hiểu từng bước đặt khám, tra cứu hồ sơ và xử lý các tình huống thường gặp.
        </p>
      </header>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <GuideNav pages={pages} />
        <div className="space-y-10">
          <section>
            <h2 className="mb-5 text-[26px]">Các hướng dẫn</h2>
            {pages.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {pages.map((page) => (
                  <Link
                    key={page.slug}
                    href={`/huong-dan/${page.slug.replace(/^huong-dan-/, '')}`}
                    className="border-hairline bg-paper group flex gap-4 rounded-xl border p-5 shadow-sm hover:shadow-md"
                  >
                    <BookOpen className="text-deep-cobalt size-6 shrink-0" aria-hidden />
                    <span className="font-semibold">
                      {page.title}
                      <ArrowRight className="text-deep-cobalt mt-2 size-4" aria-hidden />
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="border-hairline bg-paper rounded-xl border p-6">
                Nội dung hướng dẫn đang được cập nhật.
              </p>
            )}
          </section>
          <FaqList items={faqs} />
          <SupportOptions {...getSupportLinks()} />
        </div>
      </div>
    </div>
  );
}
