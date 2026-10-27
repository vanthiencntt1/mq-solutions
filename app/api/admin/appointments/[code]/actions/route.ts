import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import {
  AppointmentActionSchema,
  AppointmentCodeSchema,
  getAdminAppointmentsService,
} from '@/lib/services/admin-appointments';

type Context = { params: Promise<{ code: string }> };

export const POST = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.APPOINTMENT_READ);
  const { code } = parseWith(AppointmentCodeSchema, await ctx.params);
  const input = parseWith(AppointmentActionSchema, await req.json());
  return ok(await getAdminAppointmentsService().action(actor, code, input));
});
