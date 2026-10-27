import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminPaymentsService } from '@/lib/services/admin-payments';
import { PaymentIdSchema, RefundCompleteSchema } from '@/lib/services/admin-payments/types';

type Context = { params: Promise<{ id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REFUND_CREATE);
  const { id } = parseWith(PaymentIdSchema, await ctx.params);
  const input = parseWith(RefundCompleteSchema, await req.json());
  return ok(await getAdminPaymentsService().completeRefund(actor, id, input));
});
