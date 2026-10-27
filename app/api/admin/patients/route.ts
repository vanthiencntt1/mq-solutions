import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminPatientsService, PatientSearchSchema } from '@/lib/services/admin-patients';

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.PATIENT_READ);
  const query = parseWith(PatientSearchSchema, await req.json());
  const result = await getAdminPatientsService().search(admin, query);
  return ok(result);
});
