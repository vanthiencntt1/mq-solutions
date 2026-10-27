import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, route } from '@/lib/http/api';
import { getAdminNavCounts } from '@/lib/services/report';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.DASHBOARD_READ);
  const counts = await getAdminNavCounts(actor);
  return ok(counts, undefined, { headers: { 'Cache-Control': 'private, no-store' } });
});
