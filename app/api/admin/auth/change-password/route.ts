import { AdminPasswordSchema } from '@/lib/domain/admin/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminAuthService } from '@/lib/services/admin-auth';
import { clearAdminCookie, requireAdminApi } from '@/app/_lib/admin-session';
import { requestCtx } from '@/app/_lib/session';

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req);
  const input = parseWith(AdminPasswordSchema, await req.json());
  await getAdminAuthService().changePassword(admin.id, input, requestCtx(req).ipHash);
  const res = ok({ changed: true });
  clearAdminCookie(res);
  return res;
});
