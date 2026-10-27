import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { AppointmentQuerySchema, getAdminAppointmentsService } from '@/lib/services/admin-appointments';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.APPOINTMENT_READ);
  const query = parseWith(AppointmentQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getAdminAppointmentsService().list(actor, query));
});
