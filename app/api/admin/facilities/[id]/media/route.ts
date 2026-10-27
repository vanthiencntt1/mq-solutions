import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityIdSchema, FacilityMediaSchema } from '@/lib/domain/admin/facility-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

type Context = { params: Promise<{ id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.FACILITY_UPDATE);
  const { id } = parseWith(FacilityIdSchema, await ctx.params);
  const { kind, mime, data } = parseWith(FacilityMediaSchema, await req.json());
  return ok(await getAdminFacilityService().upload(admin, id, kind, Buffer.from(data, 'base64'), mime));
});
