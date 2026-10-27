import { LoginSchema } from '@/lib/domain/account/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAuthService } from '@/lib/services/auth';
import { requestCtx, setSessionCookies } from '@/app/_lib/session';

// POST /api/auth/login – C01 mục 5
export const POST = route(async (req) => {
  const input = parseWith(LoginSchema, await req.json());
  const r = await getAuthService().login(input, requestCtx(req));
  const res = ok({ mustChangePassword: r.mustChangePassword });
  setSessionCookies(res, r.token, r.remember);
  return res;
});
