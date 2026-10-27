import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';
import { ListQuerySchema } from '@/lib/services/notification/notification-service';

export const GET = route(async (req) => {
  await requireAdminApi(req, PERMISSIONS.NOTIFICATION_READ);
  const query = parseWith(ListQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getNotificationService().listEmailLogs(query.page, query.pageSize);
  return ok(
    {
      rows: result.rows.map(({ toHash, ...row }) => ({
        ...row,
        recipient: `***@*** · ${toHash.slice(0, 8)}`,
      })),
      today: result.today,
    },
    { page: query.page, pageSize: query.pageSize, total: result.total },
  );
});
