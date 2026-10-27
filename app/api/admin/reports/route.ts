import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getReportService } from '@/lib/services/report';
import { ReportQuerySchema } from '@/lib/services/report/types';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REPORT_READ);
  const query = parseWith(ReportQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getReportService().report(actor, query));
});
