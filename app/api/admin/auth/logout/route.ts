import { ok, route } from '@/lib/http/api';
import { getAdminAuthService } from '@/lib/services/admin-auth';
import { adminCookie, clearAdminCookie } from '@/app/_lib/admin-session';
import { requestCtx } from '@/app/_lib/session';

export const POST = route(async (req) => {
  await getAdminAuthService().logout(adminCookie(req), requestCtx(req).ipHash);
  const res = ok({ loggedOut: true });
  clearAdminCookie(res);
  return res;
});
