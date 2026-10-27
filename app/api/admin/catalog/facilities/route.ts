import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, route } from '@/lib/http/api';
import { getAdminCatalogService } from '@/lib/services/admin-catalog';

export const GET = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CATALOG_READ);
  return ok(await getAdminCatalogService().listFacilities(admin));
});
