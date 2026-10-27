import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminRoleCreateSchema } from '@/lib/domain/admin/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminUsersService } from '@/lib/services/admin-users';
import { requireAdminApi } from '@/app/_lib/admin-session';

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.ADMIN_USERS_MANAGE);
  const input = parseWith(AdminRoleCreateSchema, await req.json());
  await getAdminUsersService().createRole(admin, input);
  return ok({ created: true }, undefined, { status: 201 });
});
