import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { getContentService } from '@/lib/services/content';
import { formatDate } from '@/lib/utils/format';

export const revalidate = 60;
const SlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9-]+$/);
// W07 mục 3: StaticPage dùng chung cho nhiều loại nội dung, route này chỉ hiển thị pháp lý.
const POLICY_SLUGS = new Set([
  'dieu-khoan-su-dung',
  'dieu-khoan-dich-vu',
  'chinh-sach-bao-mat',
  'chinh-sach-xu-ly-du-lieu-ca-nhan',
  'quy-dinh-su-dung',
  'quy-dinh-huy-hoan-tien',
  'chinh-sach-huy-hoan-tien',
]);
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = SlugSchema.safeParse((await params).slug);
  if (!slug.success || !POLICY_SLUGS.has(slug.data)) return {};
  const page = await getContentService().pageBySlug(slug.data);
  return page ? { title: page.title, alternates: { canonical: `/chinh-sach/${slug.data}` } } : {};
}

export default async function Page({ params }: Props) {
  const slug = SlugSchema.safeParse((await params).slug);
  if (!slug.success || !POLICY_SLUGS.has(slug.data)) notFound();
  const page = await getContentService().pageBySlug(slug.data);
  if (!page) notFound();
  return (
    <div className="container-page py-10 md:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/huong-dan" className="text-deep-cobalt mb-8 inline-block font-semibold">
          ← Hướng dẫn & hỗ trợ
        </Link>
        <header className="border-hairline mb-8 border-b pb-6">
          <p className="text-deep-cobalt text-body-sm mb-3 font-semibold uppercase">Thông tin pháp lý</p>
          <h1 className="text-[32px] leading-tight md:text-[50px]">{page.title}</h1>
          <p className="text-slate-gray mt-4">
            Phiên bản {page.version} · Có hiệu lực từ {formatDate(page.effectiveAt)}
          </p>
        </header>
        <BlockRenderer blocks={page.blocks} />
      </div>
    </div>
  );
}
