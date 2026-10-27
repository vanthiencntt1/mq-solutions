import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminContactsPanel } from '@/components/features/admin/review/admin-contacts-panel';
import { AdminReviewsPanel } from '@/components/features/admin/review/admin-reviews-panel';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getAdminReviewService } from '@/lib/services/admin-review';
import { AdminReviewQuerySchema, ContactQuerySchema } from '@/lib/services/admin-review/types';

export const metadata: Metadata = { title: 'Đánh giá, liên hệ' };

type Search = {
  view?: string;
  page?: string;
  facilityId?: string;
  rating?: string;
  status?: string;
};

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await requireAdminPage(PERMISSIONS.REVIEW_READ);
  const raw = await searchParams;
  const view = raw.view === 'contacts' && actor.facilityIds === null ? 'contacts' : 'reviews';
  const service = getAdminReviewService();

  if (view === 'contacts') {
    const query = ContactQuerySchema.parse({ page: raw.page, status: raw.status });
    const [result, assignees] = await Promise.all([
      service.listContacts(actor, query),
      service.assignees(actor),
    ]);
    return (
      <div className="space-y-6">
        <Header view={view} global />
        <AdminContactsPanel
          rows={result.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
          total={result.total}
          page={query.page}
          pageSize={query.pageSize}
          status={query.status ?? ''}
          assignees={assignees}
        />
      </div>
    );
  }

  const query = AdminReviewQuerySchema.parse({
    page: raw.page,
    facilityId: raw.facilityId,
    rating: raw.rating,
    status: raw.status,
  });
  const [result, facilities] = await Promise.all([
    service.listReviews(actor, query),
    service.facilities(actor),
  ]);
  return (
    <div className="space-y-6">
      <Header view={view} global={actor.facilityIds === null} />
      <AdminReviewsPanel
        rows={result.rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }))}
        total={result.total}
        page={query.page}
        pageSize={query.pageSize}
        facilities={facilities}
        facilityId={query.facilityId ?? ''}
        status={query.status ?? ''}
        rating={query.rating?.toString() ?? ''}
      />
    </div>
  );
}

function Header({ view, global }: { view: 'reviews' | 'contacts'; global: boolean }) {
  return (
    <header className="space-y-4">
      <div>
        <p className="text-primary text-sm font-semibold">A09 · TƯƠNG TÁC</p>
        <h1 className="text-ink-navy text-[28px] font-bold">Đánh giá & liên hệ</h1>
        <p className="text-slate-gray text-sm">Duyệt trải nghiệm khám và theo dõi yêu cầu hợp tác.</p>
      </div>
      <nav aria-label="Mục đánh giá và liên hệ" className="border-border flex gap-2 border-b">
        <Link
          href="/admin/danh-gia"
          aria-current={view === 'reviews' ? 'page' : undefined}
          className={`px-4 py-3 text-sm font-semibold ${view === 'reviews' ? 'border-primary text-primary border-b-2' : 'text-slate-gray'}`}
        >
          Đánh giá
        </Link>
        {global ? (
          <Link
            href="/admin/danh-gia?view=contacts"
            aria-current={view === 'contacts' ? 'page' : undefined}
            className={`px-4 py-3 text-sm font-semibold ${view === 'contacts' ? 'border-primary text-primary border-b-2' : 'text-slate-gray'}`}
          >
            Liên hệ hợp tác
          </Link>
        ) : null}
        <Link href="/admin/danh-gia/gop-y" className="text-slate-gray px-4 py-3 text-sm font-semibold">
          Góp ý
        </Link>
      </nav>
    </header>
  );
}
