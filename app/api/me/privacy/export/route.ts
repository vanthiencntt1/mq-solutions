import { ok, route } from '@/lib/http/api';
import { getPrivacyService } from '@/lib/services/privacy';
import { requestCtx, requireApiSession } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

// C10: chỉ chủ tài khoản đang đăng nhập được tải bản sao dữ liệu web.
export const GET = route(async (req) => {
  const session = await requireApiSession(req);
  const data = await getPrivacyService().exportData(session.id, requestCtx(req).ipHash);
  return ok(data, undefined, { headers: { 'Cache-Control': 'private, no-store' } });
});
