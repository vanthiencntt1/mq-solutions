import { ok, parseWith, route } from '@/lib/http/api';
import { DeletionRequestSchema } from '@/lib/services/privacy/privacy-service';
import { getPrivacyService } from '@/lib/services/privacy';
import { requestCtx, requireApiSession } from '@/app/_lib/session';

// C10: yêu cầu xóa cần phiên hợp lệ, mật khẩu hiện tại và xác nhận rõ ràng.
export const POST = route(async (req) => {
  const session = await requireApiSession(req);
  const body = parseWith(DeletionRequestSchema, await req.json());
  const data = await getPrivacyService().requestDeletion(session.id, body.password, requestCtx(req).ipHash);
  return ok(data, undefined, { headers: { 'Cache-Control': 'private, no-store' } });
});
