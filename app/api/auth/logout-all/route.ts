import { ok, route } from '@/lib/http/api';
import { getAuthService } from '@/lib/services/auth';
import { clearSessionCookies, requestCtx, requireApiSession } from '@/app/_lib/session';

// POST /api/auth/logout-all – token_version + 1, mọi thiết bị bị đăng xuất
export const POST = route(async (req) => {
  const s = await requireApiSession(req, { allowMustChange: true });
  await getAuthService().logoutAll(s.id, requestCtx(req));
  const res = ok({ loggedOut: true });
  clearSessionCookies(res);
  return res;
});
