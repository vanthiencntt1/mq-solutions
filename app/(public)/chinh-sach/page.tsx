import type { Metadata } from 'next';
import { BlockRenderer } from '@/components/features/content/block-renderer';
import { PolicyNav, POLICY_SLUGS } from '@/components/features/content/policy-nav';
import { EmptyState } from '@/components/ui/empty-state';
import { getContentService } from '@/lib/services/content';
import { formatDate } from '@/lib/utils/format';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Chính sách', alternates: { canonical: '/chinh-sach' } };

export default async function Page() {
  const service = getContentService();
  const pages = (await Promise.all(POLICY_SLUGS.map((slug) => service.pageBySlug(slug)))).filter(
    (page) => page !== null,
  );
  const featured = pages[0];
  return (
    <main className="container-page py-12 md:py-16">
      <header className="mb-10 max-w-3xl">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">Thông tin pháp lý</p>
        <h1 className="text-display-responsive mt-4">Chính sách</h1>
        <p className="text-slate-gray mt-5 text-lg leading-8">
          Các quy định và điều khoản áp dụng khi sử dụng dịch vụ đặt khám.
        </p>
      </header>
      {featured ? (
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <PolicyNav pages={pages} current={featured.slug} />
          <article className="max-w-[720px] min-w-0">
            <header className="border-hairline mb-8 border-b pb-6">
              <h2 className="section-title">{featured.title}</h2>
              <p className="text-slate-gray mt-4">
                Phiên bản {featured.version} · Có hiệu lực từ {formatDate(featured.effectiveAt)}
              </p>
            </header>
            <BlockRenderer blocks={featured.blocks} />
          </article>
        </div>
      ) : (
        <EmptyState title="Chưa có chính sách" description="Vui lòng quay lại sau." />
      )}
    </main>
  );
}
