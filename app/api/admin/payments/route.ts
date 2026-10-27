import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminPaymentsService } from '@/lib/services/admin-payments';
import { PaymentQuerySchema } from '@/lib/services/admin-payments/types';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.PAYMENT_READ);
  const query = parseWith(PaymentQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getAdminPaymentsService().list(actor, query);
  return ok(result.rows, { page: query.page, pageSize: query.pageSize, total: result.total });
});
