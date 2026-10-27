import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { feedbackIdSchema } from '@/lib/domain/feedback/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getFeedbackService } from '@/lib/services/feedback';

type Context = { params: Promise<{ id: string }> };

export const POST = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REVIEW_READ);
  const { id } = parseWith(feedbackIdSchema, await ctx.params);
  await getFeedbackService().resendDoneEmail(actor, id);
  return ok({ sent: true });
});
