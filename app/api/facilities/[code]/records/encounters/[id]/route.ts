import { z } from 'zod';
import { requestCtx, requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getRecordsService } from '@/lib/services/records';

export const dynamic = 'force-dynamic';
const Params = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{2,20}$/),
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
});
const Query = z.object({
  mmyy: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\d{2}$/)
    .optional(),
});

export const GET = route(async (req, ctx: { params: Promise<{ code: string; id: string }> }) => {
  const s = await requireApiSession(req);
  const { code, id } = parseWith(Params, await ctx.params);
  const { mmyy } = parseWith(Query, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getRecordsService().encounter(s.id, code, id, requestCtx(req).ipHash, mmyy), undefined, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
});
