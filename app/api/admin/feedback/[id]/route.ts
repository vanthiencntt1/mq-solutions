import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { feedbackIdSchema, updateFeedbackSchema } from '@/lib/domain/feedback/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getFeedbackService } from '@/lib/services/feedback';

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REVIEW_READ);
  const { id } = parseWith(feedbackIdSchema, await ctx.params);
  const input = parseWith(updateFeedbackSchema, await req.json());
  const { accountId: _accountId, ...row } = await getFeedbackService().updateAdmin(actor, id, input);
  return ok(row);
});
