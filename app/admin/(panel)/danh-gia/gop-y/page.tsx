import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminFeedbackPanel } from '@/components/features/admin/feedback/admin-feedback-panel';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { adminFeedbackListSchema } from '@/lib/domain/feedback/schemas';
import { getAdminReviewService } from '@/lib/services/admin-review';
import { getFeedbackService } from '@/lib/services/feedback';

export const metadata: Metadata = { title: 'Góp ý bệnh nhân', robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; facilityId?: string }>;
}) {
  const actor = await requireAdminPage(PERMISSIONS.REVIEW_READ);
  const query = adminFeedbackListSchema.parse(await searchParams);
  const service = getFeedbackService();
  const [result, assignees, facilities] = await Promise.all([
    service.listAdmin(actor, query),
    service.assignees(actor),
    getAdminReviewService().facilities(actor),
  ]);

  return (
    <div className="space-y-6">
      <header className="space-y-4">
        <div>
          <p className="text-primary text-sm font-semibold">A09 · TƯƠNG TÁC</p>
          <h1 className="text-ink-navy text-[28px] font-bold">Góp ý bệnh nhân</h1>
          <p className="text-slate-gray text-sm">Phân công xử lý và cập nhật kết quả cho bệnh nhân.</p>
        </div>
        <nav aria-label="Mục đánh giá và liên hệ" className="border-border flex gap-2 border-b">
          <Link href="/admin/danh-gia" className="text-slate-gray px-4 py-3 text-sm font-semibold">
            Đánh giá
          </Link>
          {actor.facilityIds === null ? (
            <Link
              href="/admin/danh-gia?view=contacts"
              className="text-slate-gray px-4 py-3 text-sm font-semibold"
            >
              Liên hệ hợp tác
            </Link>
          ) : null}
          <Link
            href="/admin/danh-gia/gop-y"
            aria-current="page"
            className="border-primary text-primary border-b-2 px-4 py-3 text-sm font-semibold"
          >
            Góp ý
          </Link>
        </nav>
      </header>
      <AdminFeedbackPanel
        rows={result.rows.map(({ accountId: _accountId, createdAt, ...row }) => ({
          ...row,
          createdAt: createdAt.toISOString(),
        }))}
        total={result.total}
        page={query.page}
        pageSize={query.pageSize}
        status={query.status ?? ''}
        facilityId={query.facilityId ?? ''}
        facilities={facilities}
        assignees={assignees}
      />
    </div>
  );
}
