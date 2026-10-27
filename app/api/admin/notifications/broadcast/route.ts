import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';
import { BroadcastSchema } from '@/lib/services/notification/notification-service';

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  const input = parseWith(BroadcastSchema, await req.json());
  return ok({ count: await getNotificationService().broadcast(admin, input) });
});
