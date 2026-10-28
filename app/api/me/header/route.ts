import { requireApiSession } from '@/app/_lib/session';
import { ok, route } from '@/lib/http/api';

export const dynamic = 'force-dynamic';

/** Chỉ dùng cho header đã đăng nhập; không trả SĐT, email hay định danh bệnh nhân. */
export const GET = route(async (req) => {
  const session = await requireApiSession(req, { allowMustChange: true });
  return ok({ displayName: session.fullName }, undefined, { headers: { 'Cache-Control': 'no-store' } });
});
