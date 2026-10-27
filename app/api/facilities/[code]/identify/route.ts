import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getIdentityService } from '@/lib/services/identity';
import { requestCtx, requireApiSession } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

const Body = z.object({ refresh: z.boolean().optional() });

// POST /api/facilities/[code]/identify – C03 mục 7. Trả trạng thái + MaBN đã che.
export const POST = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const s = await requireApiSession(req);
  const { code } = await ctx.params;
  const { refresh } = parseWith(Body, await req.json().catch(() => ({})));
  const view = await getIdentityService().identify(s.id, code, {
    refresh,
    ipHash: requestCtx(req).ipHash,
  });
  return ok(view);
});
