import type { Job } from 'bullmq';
import { getPaymentService } from '@/lib/services/payment';

// C07 mục 2: DB là nguồn quyết định hạn 15 phút; nhả khóa Redis sau khi đổi trạng thái.
export async function processPaymentExpire(_job: Job): Promise<void> {
  await getPaymentService().expireDue();
}
