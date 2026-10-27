import { z } from 'zod';
import { requestCtx, requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getRecordsService } from '@/lib/services/records';

export const dynamic = 'force-dynamic';
const Params = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{2,20}$/) });
const Query = z.object({
  mmyy: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\d{2}$/)
    .optional(),
});

// C04 mục 6: MaBN trong URL/query bị bỏ qua; service tự định danh lại phía server.
export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const s = await requireApiSession(req);
  const { code } = parseWith(Params, await ctx.params);
  const { mmyy } = parseWith(Query, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getRecordsService().encounters(s.id, code, mmyy, requestCtx(req).ipHash), undefined, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
});
