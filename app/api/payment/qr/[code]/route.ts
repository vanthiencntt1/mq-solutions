import { z } from 'zod';
import { requireApiSession } from '@/app/_lib/session';
import { appointmentCodeSchema } from '@/lib/domain/payment/types';
import { parseWith, route } from '@/lib/http/api';
import { getPaymentService } from '@/lib/services/payment';

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const session = await requireApiSession(req);
  const { code } = parseWith(z.object({ code: appointmentCodeSchema }), await ctx.params);
  const image = await getPaymentService().qrImage(session.id, code);
  const buffer = new ArrayBuffer(image.byteLength);
  new Uint8Array(buffer).set(image);
  return new Response(buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${code}-vietqr.png"`,
      'Cache-Control': 'private, no-store',
    },
  });
});
