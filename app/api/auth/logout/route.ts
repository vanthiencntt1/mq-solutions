import { ok, route } from '@/lib/http/api';
import { clearSessionCookies } from '@/app/_lib/session';

// POST /api/auth/logout – xóa cookie trên thiết bị này
export const POST = route(async () => {
  const res = ok({ loggedOut: true });
  clearSessionCookies(res);
  return res;
});
