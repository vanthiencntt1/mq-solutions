import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getReconcileService } from '@/lib/services/reconcile';
import { RunReconcileSchema } from '@/lib/services/reconcile/types';

export const POST = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.PAYMENT_READ);
  const input = parseWith(RunReconcileSchema, await req.json());
  return ok(await getReconcileService().runManual(actor, input.facilityId, input.examDate));
});
