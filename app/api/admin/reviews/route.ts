import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminReviewService } from '@/lib/services/admin-review';
import { AdminReviewQuerySchema } from '@/lib/services/admin-review/types';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REVIEW_READ);
  const query = parseWith(AdminReviewQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getAdminReviewService().listReviews(actor, query);
  return ok(result.rows, { page: query.page, pageSize: query.pageSize, total: result.total });
});
