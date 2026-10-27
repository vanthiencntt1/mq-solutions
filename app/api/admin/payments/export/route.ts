import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { parseWith, route } from '@/lib/http/api';
import { getAdminPaymentsService } from '@/lib/services/admin-payments';
import { PaymentQuerySchema } from '@/lib/services/admin-payments/types';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.PAYMENT_READ);
  const query = parseWith(PaymentQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const csv = await getAdminPaymentsService().csv(actor, query);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="a07-payments.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
});
