import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityIdSchema, FacilityStatusSchema } from '@/lib/domain/admin/facility-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

type Context = { params: Promise<{ id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_UPDATE);
  const { id } = parseWith(FacilityIdSchema, await ctx.params);
  const { status } = parseWith(FacilityStatusSchema, await req.json());
  return ok(await getAdminFacilityService().changeStatus(admin, id, status));
});
