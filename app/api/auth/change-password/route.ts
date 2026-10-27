import { ChangePasswordSchema } from '@/lib/domain/account/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAuthService } from '@/lib/services/auth';
import { requestCtx, requireApiSession, setSessionCookies } from '@/app/_lib/session';

// POST /api/auth/change-password – C01 mục 6. Cấp JWT mới (thiết bị này vẫn đăng nhập, thiết bị khác bị đăng xuất).
export const POST = route(async (req) => {
  const s = await requireApiSession(req, { allowMustChange: true });
  const input = parseWith(ChangePasswordSchema, await req.json());
  const r = await getAuthService().changePassword(s.id, input, requestCtx(req));
  const res = ok({ changed: true });
  setSessionCookies(res, r.token, false);
  return res;
});
