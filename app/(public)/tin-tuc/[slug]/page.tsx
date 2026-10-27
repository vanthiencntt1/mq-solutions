import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, Stethoscope } from 'lucide-react';
import { z } from 'zod';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { JsonLd } from '@/components/features/content/json-ld';
import { NewsList } from '@/components/features/content/news-list';
import { PostCard } from '@/components/features/content/post-card';
import { getContentService } from '@/lib/services/content';
import { headingAnchor } from '@/lib/domain/content/heading-anchor';
import { formatDate } from '@/lib/utils/format';

export const revalidate = 60;
const SlugSchema = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-z0-9-]+$/);
const QuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).catch(1) });
type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const parsed = SlugSchema.safeParse((await params).slug);
  if (!parsed.success) return {};
  const service = getContentService();
  const post = await service.postBySlug(parsed.data);
  if (post)
    return {
      title: post.seoTitle ?? post.title,
      description: post.seoDesc ?? post.excerpt ?? undefined,
      alternates: { canonical: `/tin-tuc/${post.slug}` },
      openGraph: {
        title: post.title,
        description: post.excerpt ?? undefined,
        type: 'article',
        publishedTime: post.publishedAt?.toISOString(),
        images: post.coverUrl ? [{ url: post.coverUrl }] : undefined,
      },
    };
  const category = (await service.categories()).find((item) => item.slug === parsed.data);
  const { page } = QuerySchema.parse(await searchParams);
  return category
    ? {
        title: `${category.name} - Tin tức${page > 1 ? ` – Trang ${page}` : ''}`,
        alternates: { canonical: `/tin-tuc/${category.slug}${page > 1 ? `?page=${page}` : ''}` },
      }
    : {};
}

export default async function Page({ params, searchParams }: Props) {
  const parsed = SlugSchema.safeParse((await params).slug);
  if (!parsed.success) notFound();
  const service = getContentService();
  const post = await service.postBySlug(parsed.data);
  if (!post) {
    const categories = await service.categories();
    const category = categories.find((item) => item.slug === parsed.data);
    if (!category) notFound();
    const { page } = QuerySchema.parse(await searchParams);
    const result = await service.posts(page, 9, category.slug);
    return (
      <NewsList
        title={category.name}
        description={`Bài viết trong chuyên mục ${category.name}.`}
        posts={result.items}
        categories={categories}
        page={result.page}
        pageSize={result.pageSize}
        total={result.total}
        categorySlug={category.slug}
      />
    );
  }
  const related = await service.related(post);
  const headings = post.blocks.flatMap((block, index) =>
    block.type === 'heading' ? [{ text: block.text, anchor: headingAnchor(block.text, index) }] : [],
  );
  const medical =
    Boolean(post.reviewerName) || ['tin-y-te', 'y-hoc-thuong-thuc'].includes(post.category.slug);
  const url = `/tin-tuc/${post.slug}`;
  return (
    <div className="container-page py-10 md:py-16">
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt?.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: post.authorName
            ? { '@type': 'Person', name: post.authorName }
            : { '@type': 'Organization', name: 'MQ Solutions' },
          ...(post.coverUrl ? { image: post.coverUrl } : {}),
          mainEntityOfPage: url,
          ...(medical ? { about: { '@type': 'MedicalWebPage' } } : {}),
        }}
      />
      <Link href="/tin-tuc" className="text-deep-cobalt mb-8 inline-flex items-center gap-2 font-semibold">
        <ArrowLeft className="size-4" aria-hidden /> Tin tức
      </Link>
      <article className="mx-auto max-w-4xl">
        <header className="border-hairline mb-8 border-b pb-8">
          <p className="text-deep-cobalt text-body-sm mb-3 font-semibold">{post.category.name}</p>
          <h1 className="text-[32px] leading-tight md:text-[50px]">{post.title}</h1>
          {post.excerpt && <p className="text-slate-gray mt-4 text-[18px] leading-7">{post.excerpt}</p>}
          <div className="text-body-sm text-slate-gray mt-5 flex flex-wrap gap-x-5 gap-y-2">
            {post.publishedAt && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" aria-hidden /> {formatDate(post.publishedAt)}
              </span>
            )}
            {post.authorName && <span>Tác giả: {post.authorName}</span>}
            {post.reviewerName && (
              <span className="inline-flex items-center gap-1">
                <Stethoscope className="size-4" aria-hidden /> Duyệt chuyên môn: {post.reviewerName}
              </span>
            )}
          </div>
        </header>
        {headings.length > 1 && (
          <nav aria-label="Mục lục bài viết" className="border-hairline bg-paper mb-8 rounded-xl border p-5">
            <h2 className="mb-3 text-[18px]">Trong bài viết</h2>
            <ol className="space-y-2">
              {headings.map((heading, i) => (
                <li key={i} className="text-body-sm">
                  <a href={`#${heading.anchor}`} className="text-deep-cobalt hover:underline">
                    {heading.text}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {post.coverUrl && (
          <Image
            src={post.coverUrl}
            alt={`Ảnh bìa: ${post.title}`}
            width={1200}
            height={720}
            unoptimized
            className="mb-8 h-auto w-full rounded-xl"
          />
        )}
        <BlockRenderer blocks={post.blocks} />
        {medical && (
          <p className="border-hairline text-body-sm text-slate-gray mt-8 border-t pt-5">
            Nội dung y khoa chỉ mang tính tham khảo, không thay thế chẩn đoán hoặc tư vấn trực tiếp của bác
            sĩ.
          </p>
        )}
        {post.specialtyTags.length > 0 && (
          <div className="bg-info-bg mt-8 rounded-xl p-6">
            <h2 className="text-[20px]">Cần khám chuyên khoa {post.specialtyTags.join(', ')}?</h2>
            <p className="text-slate-gray mt-2">Chọn cơ sở y tế và đặt lịch khám phù hợp.</p>
            <Link href="/co-so-y-te" className="text-deep-cobalt mt-4 inline-block font-semibold">
              Đặt khám ngay →
            </Link>
          </div>
        )}
        <div className="text-body-sm text-slate-gray mt-6 flex gap-3">
          Chia sẻ bài viết:{' '}
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${process.env.APP_URL ?? ''}${url}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-deep-cobalt underline"
          >
            Facebook
          </a>
        </div>
      </article>
      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-[26px]">Bài viết liên quan</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {related.map((item) => (
              <PostCard key={item.id} post={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
