import { RegisterSchema } from '@/lib/domain/account/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAuthService } from '@/lib/services/auth';
import { requestCtx } from '@/app/_lib/session';

// POST /api/auth/register – C01 mục 4
export const POST = route(async (req) => {
  const input = parseWith(RegisterSchema, await req.json());
  const r = await getAuthService().register(input, requestCtx(req));
  return ok({ emailMasked: r.emailMasked });
});
