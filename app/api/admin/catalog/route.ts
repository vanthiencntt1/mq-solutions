import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminCatalogService } from '@/lib/services/admin-catalog';
import { catalogQuerySchema } from '@/lib/services/admin-catalog/admin-catalog-service';

export const GET = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CATALOG_READ);
  const query = parseWith(catalogQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getAdminCatalogService().read(admin, query));
});
