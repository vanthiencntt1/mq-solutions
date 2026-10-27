import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';

export const GET = route(async (req) => {
  await requireAdminApi(req, PERMISSIONS.NOTIFICATION_READ);
  return ok(await getNotificationService().listTemplates());
});
