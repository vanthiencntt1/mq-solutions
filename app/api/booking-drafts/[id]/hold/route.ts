import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getBookingDraftService } from '@/lib/services/catalog';
import { requireApiSession } from '@/app/_lib/session';

export const POST = route(async (req, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireApiSession(req);
  const { id } = parseWith(z.object({ id: z.uuid() }), await ctx.params);
  const draft = await getBookingDraftService().hold(session.id, id);
  return ok({ id: draft.id, bookingNumber: draft.bookingNumber, expiresIn: 900 });
});
