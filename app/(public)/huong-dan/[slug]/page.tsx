import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { FaqList } from '@/components/features/content/faq-list';
import { GuideNav } from '@/components/features/content/guide-nav';
import { JsonLd } from '@/components/features/content/json-ld';
import { SupportOptions } from '@/components/features/content/support-options';
import { blocksToPlainText } from '@/lib/domain/content/plain-text';
import { getContentService, getSupportLinks } from '@/lib/services/content';

export const revalidate = 60;
const SlugSchema = z
  .string()
  .min(1)
  .max(150)
  .regex(/^[a-z0-9-]+$/);
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = SlugSchema.safeParse((await params).slug);
  if (!slug.success) return {};
  const page = slug.data === 'cau-hoi-thuong-gap' ? null : await getContentService().guide(slug.data);
  return {
    title: page?.title ?? 'Câu hỏi thường gặp',
    alternates: { canonical: `/huong-dan/${slug.data}` },
    description: page
      ? blocksToPlainText(page.blocks).slice(0, 160)
      : 'Giải đáp các câu hỏi thường gặp về đặt khám và hồ sơ.',
  };
}

export default async function Page({ params }: Props) {
  const parsed = SlugSchema.safeParse((await params).slug);
  if (!parsed.success) notFound();
  const service = getContentService();
  const [pages, faqs, page] = await Promise.all([
    service.guidePages(),
    service.faqs(),
    parsed.data === 'cau-hoi-thuong-gap' ? Promise.resolve(null) : service.guide(parsed.data),
  ]);
  if (!page && parsed.data !== 'cau-hoi-thuong-gap') notFound();
  return (
    <div className="container-page py-10 md:py-16">
      <Link href="/huong-dan" className="text-deep-cobalt mb-8 inline-block font-semibold">
        ← Hướng dẫn & hỗ trợ
      </Link>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <GuideNav pages={pages} current={parsed.data} />
        <div className="max-w-3xl">
          <h1 className="mb-8 text-[32px] leading-tight md:text-[50px]">
            {page?.title ?? 'Câu hỏi thường gặp'}
          </h1>
          {page ? (
            <BlockRenderer blocks={page.blocks} />
          ) : (
            <>
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
              <FaqList items={faqs} />
            </>
          )}
          <SupportOptions {...getSupportLinks()} />
        </div>
      </div>
    </div>
  );
}
