import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminUserIdSchema } from '@/lib/domain/admin/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminUsersService } from '@/lib/services/admin-users';
import { requireAdminApi } from '@/app/_lib/admin-session';

type Context = { params: Promise<{ id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const admin = await requireAdminApi(req, PERMISSIONS.STAFF_MANAGE);
  const { id } = parseWith(AdminUserIdSchema, await ctx.params);
  await getAdminUsersService().resetTotp(admin, id);
  return ok({ reset: true });
});
