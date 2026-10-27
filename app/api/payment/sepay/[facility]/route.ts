import { z } from 'zod';
import { facilityCodeSchema } from '@/lib/domain/payment/types';
import { parseWith, route } from '@/lib/http/api';
import { getPaymentService } from '@/lib/services/payment';

export const POST = route(async (req, ctx: { params: Promise<{ facility: string }> }) => {
  const { facility } = parseWith(z.object({ facility: facilityCodeSchema }), await ctx.params);
  await getPaymentService().handleWebhook(facility, req.headers.get('authorization'), await req.json());
  // SePay yêu cầu chính xác HTTP 200 với success=true để dừng gửi lại.
  return Response.json({ success: true });
});
