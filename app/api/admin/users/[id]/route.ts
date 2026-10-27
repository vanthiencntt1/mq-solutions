import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminUserIdSchema, AdminUserUpdateSchema } from '@/lib/domain/admin/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminUsersService } from '@/lib/services/admin-users';
import { requireAdminApi } from '@/app/_lib/admin-session';

type Context = { params: Promise<{ id: string }> };
export const PATCH = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.STAFF_MANAGE);
  const { id } = parseWith(AdminUserIdSchema, await ctx.params);
  const input = parseWith(AdminUserUpdateSchema, await req.json());
  return ok(await getAdminUsersService().update(admin, id, input));
});
