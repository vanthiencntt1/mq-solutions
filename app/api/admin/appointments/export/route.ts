import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { parseWith, route } from '@/lib/http/api';
import { AppointmentQuerySchema, getAdminAppointmentsService } from '@/lib/services/admin-appointments';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.APPOINTMENT_READ);
  const query = parseWith(AppointmentQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const csv = await getAdminAppointmentsService().csv(actor, query);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="lich-dat-kham.csv"',
      'Cache-Control': 'private, no-store',
    },
  });
});
