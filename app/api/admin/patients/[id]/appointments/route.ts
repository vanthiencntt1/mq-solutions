import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminPatientsService, PatientIdSchema, PatientPageSchema } from '@/lib/services/admin-patients';

type Context = { params: Promise<{ id: string }> };

export const GET = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.PATIENT_READ);
  const { id } = parseWith(PatientIdSchema, await ctx.params);
  const { page } = parseWith(PatientPageSchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getAdminPatientsService().appointments(admin, id, page);
  return ok(result.rows, { page, pageSize: result.pageSize, total: result.total });
});
