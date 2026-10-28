import type { Job } from 'bullmq';
import { getPaymentService } from '@/lib/services/payment';

// C07 mục 2: DB là nguồn quyết định hạn 15 phút; nhả khóa Redis sau khi đổi trạng thái.
export async function processPaymentExpire(_job: Job): Promise<void> {
  const service = getPaymentService();
  // Hỏi lại PayOS trước khi cho hết hạn: tiền đã vào mà lỡ webhook thì không nhả số oan.
  await service.syncPayosDue();
  await service.expireDue();
}
