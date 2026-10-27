import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminPaymentsService } from '@/lib/services/admin-payments';
import { PaymentIdSchema } from '@/lib/services/admin-payments/types';

type Context = { params: Promise<{ id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REFUND_APPROVE);
  const { id } = parseWith(PaymentIdSchema, await ctx.params);
  return ok(await getAdminPaymentsService().approveRefund(actor, id));
});
