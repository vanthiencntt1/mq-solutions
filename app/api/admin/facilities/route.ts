import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityCreateSchema, FacilityListSchema } from '@/lib/domain/admin/facility-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

export const GET = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_READ);
  const query = parseWith(FacilityListSchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getAdminFacilityService().list(admin, query);
  return ok(result.rows, { page: query.page, pageSize: query.pageSize, total: result.total });
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_UPDATE);
  const input = parseWith(FacilityCreateSchema, await req.json());
  return ok(await getAdminFacilityService().create(admin, input), undefined, { status: 201 });
});
