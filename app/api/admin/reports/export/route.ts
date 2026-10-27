import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { parseWith, route } from '@/lib/http/api';
import { getReportService } from '@/lib/services/report';
import { reportCsv } from '@/lib/services/report/csv';
import { ReportQuerySchema } from '@/lib/services/report/types';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.REPORT_READ);
  const query = parseWith(ReportQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const report = await getReportService().report(actor, query);
  return new Response(reportCsv(report.bookings, report.revenue), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="bao-cao-${query.from}-${query.to}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
