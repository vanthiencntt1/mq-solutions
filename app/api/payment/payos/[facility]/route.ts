import { z } from 'zod';
import { facilityCodeSchema } from '@/lib/domain/payment/types';
import { parseWith, route } from '@/lib/http/api';
import { getPaymentService } from '@/lib/services/payment';

// C07: URL webhook PayOS của từng cơ sở – dán vào trang quản lý kênh thanh toán PayOS.
export const POST = route(async (req, ctx: { params: Promise<{ facility: string }> }) => {
  const { facility } = parseWith(z.object({ facility: facilityCodeSchema }), await ctx.params);
  const result = await getPaymentService().handlePayosWebhook(facility, await req.json());
  // PayOS chỉ cần HTTP 2xx để dừng gửi lại (kể cả webhook thử khi đăng ký URL).
  return Response.json({ success: true, status: result.status });
});
