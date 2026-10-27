import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { AppointmentCodeSchema, getAdminAppointmentsService } from '@/lib/services/admin-appointments';

type Context = { params: Promise<{ code: string }> };

export const GET = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.APPOINTMENT_READ);
  const { code } = parseWith(AppointmentCodeSchema, await ctx.params);
  return ok(await getAdminAppointmentsService().detail(actor, code));
});
