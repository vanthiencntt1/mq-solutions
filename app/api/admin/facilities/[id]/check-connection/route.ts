import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityIdSchema } from '@/lib/domain/admin/facility-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

type Context = { params: Promise<{ id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_UPDATE);
  const { id } = parseWith(FacilityIdSchema, await ctx.params);
  return ok(await getAdminFacilityService().checkConnection(admin, id));
});
