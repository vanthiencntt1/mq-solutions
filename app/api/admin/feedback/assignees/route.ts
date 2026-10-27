import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, route } from '@/lib/http/api';
import { getFeedbackService } from '@/lib/services/feedback';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REVIEW_READ);
  return ok(await getFeedbackService().assignees(actor));
});
