import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, route } from '@/lib/http/api';
import { getAdminUsersService } from '@/lib/services/admin-users';
import { requireAdminApi } from '@/app/_lib/admin-session';

export const GET = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.STAFF_MANAGE);
  return ok(await getAdminUsersService().options(admin));
});
