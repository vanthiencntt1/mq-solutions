import type { Metadata } from 'next';
import { z } from 'zod';
import { NewsList } from '@/components/features/content/news-list';
import { getContentService } from '@/lib/services/content';

export const revalidate = 60;
const QuerySchema = z.object({ page: z.coerce.number().int().min(1).max(10000).catch(1) });
type Props = { searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { page } = QuerySchema.parse(await searchParams);
  return {
    title: page === 1 ? 'Tin tức' : `Tin tức – Trang ${page}`,
    description: 'Tin y tế, dịch vụ và kiến thức chăm sóc sức khỏe từ MQ Solutions.',
    alternates: { canonical: page === 1 ? '/tin-tuc' : `/tin-tuc?page=${page}` },
    openGraph: { title: 'Tin tức | MQ Solutions', type: 'website' },
  };
}

export default async function Page({ searchParams }: Props) {
  const { page } = QuerySchema.parse(await searchParams);
  const service = getContentService();
  const [result, categories] = await Promise.all([service.posts(page), service.categories()]);
  return (
    <NewsList
      title="Tin tức & kiến thức sức khỏe"
      description="Cập nhật dịch vụ, thông tin y tế và những điều hữu ích trước mỗi lần thăm khám."
      posts={result.items}
      categories={categories}
      page={result.page}
      pageSize={result.pageSize}
      total={result.total}
    />
  );
}
