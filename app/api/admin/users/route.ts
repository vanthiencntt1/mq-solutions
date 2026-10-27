import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminUserCreateSchema, AdminUserListSchema } from '@/lib/domain/admin/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminUsersService } from '@/lib/services/admin-users';
import { requireAdminApi } from '@/app/_lib/admin-session';

export const GET = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.STAFF_MANAGE);
  const query = parseWith(AdminUserListSchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getAdminUsersService().list(admin, query.page, query.pageSize);
  return ok(result.rows, { page: query.page, pageSize: query.pageSize, total: result.total });
});

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.STAFF_MANAGE);
  const input = parseWith(AdminUserCreateSchema, await req.json());
  return ok(await getAdminUsersService().create(admin, input), undefined, { status: 201 });
});
