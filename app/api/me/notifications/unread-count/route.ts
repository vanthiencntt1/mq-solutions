import { requireApiSession } from '@/app/_lib/session';
import { ok, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';

export const GET = route(async (req) => {
  const session = await requireApiSession(req);
  return ok({ count: await getNotificationService().unreadCount(session.id) });
});
