import { UpdateProfileSchema } from '@/lib/domain/account/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAuthService } from '@/lib/services/auth';
import { requestCtx, requireApiSession } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

// GET / PATCH /api/me – C01 mục 7 (CCCD, họ tên, năm sinh, giới tính chỉ xem)
export const GET = route(async (req) => {
  const s = await requireApiSession(req, { allowMustChange: true });
  return ok(await getAuthService().getProfile(s.id));
});

export const PATCH = route(async (req) => {
  const s = await requireApiSession(req);
  const input = parseWith(UpdateProfileSchema, await req.json());
  return ok(await getAuthService().updateProfile(s.id, input, requestCtx(req)));
});
