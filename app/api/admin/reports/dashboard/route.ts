import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, route } from '@/lib/http/api';
import { getReportService } from '@/lib/services/report';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.DASHBOARD_READ);
  return ok(await getReportService().dashboard(actor));
});
