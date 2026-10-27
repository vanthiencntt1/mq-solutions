import { requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';
import { ListQuerySchema } from '@/lib/services/notification/notification-service';

export const GET = route(async (req) => {
  const session = await requireApiSession(req);
  const query = parseWith(ListQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getNotificationService().list(session.id, query.page, query.pageSize);
  return ok(
    { rows: result.rows, unread: result.unread },
    { page: query.page, pageSize: query.pageSize, total: result.total },
  );
});
