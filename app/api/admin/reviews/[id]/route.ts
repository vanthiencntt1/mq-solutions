import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminReviewService } from '@/lib/services/admin-review';
import { AdminItemIdSchema, ReviewModerationSchema } from '@/lib/services/admin-review/types';

type Context = { params: Promise<{ id: string }> };

export const PATCH = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REVIEW_READ);
  const { id } = parseWith(AdminItemIdSchema, await ctx.params);
  const input = parseWith(ReviewModerationSchema, await req.json());
  return ok(await getAdminReviewService().moderate(actor, id, input));
});
