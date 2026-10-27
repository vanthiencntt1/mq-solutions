import { ForgotPasswordSchema } from '@/lib/domain/account/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAuthService } from '@/lib/services/auth';
import { requestCtx } from '@/app/_lib/session';

// POST /api/auth/forgot-password – luôn trả cùng một thông báo (C01 mục 6)
export const POST = route(async (req) => {
  const input = parseWith(ForgotPasswordSchema, await req.json());
  await getAuthService().forgotPassword(input, requestCtx(req));
  return ok({
    message:
      'Nếu thông tin khớp với tài khoản đã đăng ký, mật khẩu mới đã được gửi tới Gmail của bạn trong vài phút.',
  });
});
