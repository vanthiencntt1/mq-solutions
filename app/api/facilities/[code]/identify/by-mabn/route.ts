import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getIdentityService } from '@/lib/services/identity';
import { requestCtx, requireApiSession } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

const Body = z.object({
  maBN: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,14}$/, 'Mã bệnh nhân gồm 6–14 ký tự chữ hoặc số'),
});

// POST /api/facilities/[code]/identify/by-mabn – C03 mục 4 bước 5 (5 lần / giờ / tài khoản).
export const POST = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const s = await requireApiSession(req);
  const { code } = await ctx.params;
  const { maBN } = parseWith(Body, await req.json());
  return ok(await getIdentityService().identifyByMaBN(s.id, code, maBN, { ipHash: requestCtx(req).ipHash }));
});
