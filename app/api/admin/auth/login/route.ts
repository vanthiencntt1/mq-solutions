import { AdminLoginSchema } from '@/lib/domain/admin/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminAuthService } from '@/lib/services/admin-auth';
import { requestCtx } from '@/app/_lib/session';
import { setAdminCookie } from '@/app/_lib/admin-session';

// A01 mục 1: không tạo cookie khi chưa xác nhận TOTP.
export const POST = route(async (req) => {
  const input = parseWith(AdminLoginSchema, await req.json());
  const result = await getAdminAuthService().login(input, requestCtx(req).ipHash);
  if (result.kind === 'setup') return ok({ setupUri: result.uri });
  const res = ok({ authenticated: true });
  setAdminCookie(res, result.token);
  return res;
});
