import { z } from 'zod';
import { requestCtx, requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getMedicalReport } from '@/lib/services/records/report-service';

export const dynamic = 'force-dynamic';
const Params = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{2,20}$/),
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
});
const Query = z.object({ type: z.enum(['lab', 'imaging', 'prescription']) });

export const GET = route(async (req, ctx: { params: Promise<{ code: string; id: string }> }) => {
  const session = await requireApiSession(req);
  const { code, id } = parseWith(Params, await ctx.params);
  const { type } = parseWith(Query, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getMedicalReport(session.id, code, id, type, requestCtx(req).ipHash), undefined, {
    headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
});
