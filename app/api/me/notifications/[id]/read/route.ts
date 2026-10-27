import { z } from 'zod';
import { requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';

export const POST = route(async (req, context: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession(req);
  const { id } = parseWith(z.object({ id: z.uuid() }), await context.params);
  await getNotificationService().markRead(session.id, id);
  return ok({ read: true });
});
