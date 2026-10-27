import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getReconcileService } from '@/lib/services/reconcile';
import { ReconcileQuerySchema } from '@/lib/services/reconcile/types';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.PAYMENT_READ);
  const query = parseWith(ReconcileQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getReconcileService().list(actor, query);
  return ok(result.rows, { page: query.page, pageSize: query.pageSize, total: result.total });
});
