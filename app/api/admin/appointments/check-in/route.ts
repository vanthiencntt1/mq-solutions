import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { CheckInLookupSchema, getAdminAppointmentsService } from '@/lib/services/admin-appointments';

export const POST = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.APPOINTMENT_CHECKIN);
  const input = parseWith(CheckInLookupSchema, await req.json());
  return ok(await getAdminAppointmentsService().lookup(actor, input));
});
