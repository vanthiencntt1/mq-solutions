import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityIdSchema, FacilityUpdateSchema } from '@/lib/domain/admin/facility-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

type Context = { params: Promise<{ id: string }> };
export const GET = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_READ);
  const { id } = parseWith(FacilityIdSchema, await ctx.params);
  return ok(await getAdminFacilityService().get(admin, id));
});

export const PATCH = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_UPDATE);
  const { id } = parseWith(FacilityIdSchema, await ctx.params);
  const input = parseWith(FacilityUpdateSchema, await req.json());
  return ok(await getAdminFacilityService().update(admin, id, input));
});
