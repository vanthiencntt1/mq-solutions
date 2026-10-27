import { z } from 'zod';
import { requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getBookingService } from '@/lib/services/booking';

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const session = await requireApiSession(req);
  const { code } = parseWith(z.object({ code: z.string().regex(/^MQ[A-F0-9]{10}$/) }), await ctx.params);
  return ok(await getBookingService().get(session.id, code));
});
