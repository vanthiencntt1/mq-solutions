import { z } from 'zod';
import { requireApiSession } from '@/app/_lib/session';
import { appointmentCodeSchema } from '@/lib/domain/payment/types';
import { ok, parseWith, route } from '@/lib/http/api';
import { getPaymentService } from '@/lib/services/payment';

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const session = await requireApiSession(req);
  const { code } = parseWith(z.object({ code: appointmentCodeSchema }), await ctx.params);
  return ok(await getPaymentService().getOrCreate(session.id, code), undefined, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
});
