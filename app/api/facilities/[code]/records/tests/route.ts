import { z } from 'zod';
import { requestCtx, requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getRecordsService } from '@/lib/services/records';

export const dynamic = 'force-dynamic';
const Params = z.object({ code: z.string().regex(/^[A-Za-z0-9_-]{2,20}$/) });
const Query = z.object({ from: z.iso.date().optional(), to: z.iso.date().optional() });

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const s = await requireApiSession(req);
  const { code } = parseWith(Params, await ctx.params);
  const range = parseWith(Query, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getRecordsService().tests(s.id, code, range, requestCtx(req).ipHash), undefined, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
});
