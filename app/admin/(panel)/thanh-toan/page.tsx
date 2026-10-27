import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { PaymentsPanel } from '@/components/features/admin/payments/payments-panel';
import { ReconcilePanel } from '@/components/features/admin/payments/reconcile-panel';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getAdminPaymentsService } from '@/lib/services/admin-payments';
import { PaymentQuerySchema } from '@/lib/services/admin-payments/types';
import { getReconcileService } from '@/lib/services/reconcile';
import { ReconcileQuerySchema } from '@/lib/services/reconcile/types';

export const metadata: Metadata = { title: 'Thanh toán & đối soát' };

type Search = { view?: string; page?: string; facilityId?: string; date?: string; status?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await requireAdminPage(PERMISSIONS.PAYMENT_READ);
  const raw = await searchParams;
  const view = raw.view === 'reconcile' ? 'reconcile' : 'payments';
  const paymentService = getAdminPaymentsService();
  const facilities = await paymentService.facilities(actor);
  const role = { name: actor.role, permissions: actor.permissions };
  const tabs = (
    <nav
      aria-label="Thanh toán và đối soát"
      className="border-border flex gap-6 border-b text-sm font-semibold"
    >
      <Link
        href="/admin/thanh-toan"
        aria-current={view === 'payments' ? 'page' : undefined}
        className={`py-3 ${view === 'payments' ? 'border-primary text-primary border-b-2' : 'text-slate-gray'}`}
      >
        Giao dịch
      </Link>
      <Link
        href="/admin/thanh-toan?view=reconcile"
        aria-current={view === 'reconcile' ? 'page' : undefined}
        className={`py-3 ${view === 'reconcile' ? 'border-primary text-primary border-b-2' : 'text-slate-gray'}`}
      >
        Đối soát
      </Link>
    </nav>
  );
  if (view === 'reconcile') {
    const query = ReconcileQuerySchema.safeParse(raw);
    const filter = query.success ? query.data : ReconcileQuerySchema.parse({});
    const result = await getReconcileService().list(actor, filter);
    return (
      <section className="mx-auto max-w-[1200px] space-y-5">
        <Header />
        {tabs}
        <ReconcilePanel
          rows={result.rows.map((row) => ({
            ...row,
            startedAt: row.startedAt.toISOString(),
            finishedAt: row.finishedAt?.toISOString() ?? null,
          }))}
          total={result.total}
          page={filter.page}
          pageSize={filter.pageSize}
          facilities={facilities}
          facilityId={filter.facilityId ?? ''}
          date={filter.date ?? ''}
        />
      </section>
    );
  }
  const query = PaymentQuerySchema.safeParse(raw);
  const filter = query.success ? query.data : PaymentQuerySchema.parse({});
  const result = await paymentService.list(actor, filter);
  return (
    <section className="mx-auto max-w-[1200px] space-y-5">
      <Header />
      {tabs}
      <PaymentsPanel
        rows={result.rows.map((row) => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          paidAt: row.paidAt?.toISOString() ?? null,
          refundedAt: row.refundedAt?.toISOString() ?? null,
        }))}
        total={result.total}
        page={filter.page}
        pageSize={filter.pageSize}
        facilities={facilities}
        facilityId={filter.facilityId ?? ''}
        date={filter.date ?? ''}
        status={filter.status ?? ''}
        actorId={actor.id}
        canManage={can(role, PERMISSIONS.REFUND_CREATE)}
        canApprove={can(role, PERMISSIONS.REFUND_APPROVE)}
      />
    </section>
  );
}

function Header() {
  return (
    <header>
      <p className="text-primary text-sm font-semibold">A07 · KẾ TOÁN CƠ SỞ</p>
      <h1 className="text-ink-navy text-[28px] font-bold">Thanh toán & đối soát</h1>
      <p className="text-slate-gray text-sm">
        Theo dõi tiền vào từng cơ sở, xử lý giao dịch lệch và xác nhận hoàn tiền.
      </p>
    </header>
  );
}
