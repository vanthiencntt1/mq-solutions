import { requireApiSession } from '@/app/_lib/session';
import { ok, route } from '@/lib/http/api';
import { getFeedbackService } from '@/lib/services/feedback';

export const GET = route(async (req) => {
  const session = await requireApiSession(req);
  return ok(await getFeedbackService().myAppointments(session.id));
});
