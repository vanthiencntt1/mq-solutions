import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminPatientsService, PatientActionSchema, PatientIdSchema } from '@/lib/services/admin-patients';

type Context = { params: Promise<{ id: string }> };

export const POST = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.PATIENT_READ);
  const { id } = parseWith(PatientIdSchema, await ctx.params);
  const input = parseWith(PatientActionSchema, await req.json());
  return ok(await getAdminPatientsService().action(admin, id, input));
});
