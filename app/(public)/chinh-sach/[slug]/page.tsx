import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { PolicyNav, POLICY_SLUGS } from '@/components/features/content/policy-nav';
import { getContentService } from '@/lib/services/content';
import { formatDate } from '@/lib/utils/format';

export const revalidate = 60;
const SlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9-]+$/);
// W07 mục 3: StaticPage dùng chung cho nhiều loại nội dung, route này chỉ hiển thị pháp lý.
const policySlugs = new Set<string>(POLICY_SLUGS);
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = SlugSchema.safeParse((await params).slug);
  if (!slug.success || !policySlugs.has(slug.data)) return {};
  const page = await getContentService().pageBySlug(slug.data);
  return page ? { title: page.title, alternates: { canonical: `/chinh-sach/${slug.data}` } } : {};
}

export default async function Page({ params }: Props) {
  const slug = SlugSchema.safeParse((await params).slug);
  if (!slug.success || !policySlugs.has(slug.data)) notFound();
  const service = getContentService();
  const [page, pages] = await Promise.all([
    service.pageBySlug(slug.data),
    Promise.all(POLICY_SLUGS.map((item) => service.pageBySlug(item))),
  ]);
  if (!page) notFound();
  return (
    <main className="container-page py-12 md:py-16">
      <Link href="/chinh-sach" className="text-primary mb-8 inline-flex min-h-11 items-center font-semibold">
        ← Tất cả chính sách
      </Link>
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <PolicyNav pages={pages.filter((item) => item !== null)} current={page.slug} />
        <article className="max-w-[720px] min-w-0">
          <header className="border-hairline mb-8 border-b pb-6">
            <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">Thông tin pháp lý</p>
            <h1 className="text-[42px] leading-tight md:text-[50px]">{page.title}</h1>
            <p className="text-slate-gray mt-4">
              Phiên bản {page.version} · Có hiệu lực từ {formatDate(page.effectiveAt)}
            </p>
          </header>
          <BlockRenderer blocks={page.blocks} />
        </article>
      </div>
    </main>
  );
}
