import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { adminFeedbackListSchema } from '@/lib/domain/feedback/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getFeedbackService } from '@/lib/services/feedback';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REVIEW_READ);
  const query = parseWith(adminFeedbackListSchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getFeedbackService().listAdmin(actor, query);
  return ok(
    result.rows.map(({ accountId: _accountId, ...row }) => row),
    {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
    },
  );
});
