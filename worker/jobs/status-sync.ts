import type { Job } from 'bullmq';
import { getTicketService } from '@/lib/services/ticket';

// C08 mục 3: mỗi cơ sở được xử lý độc lập trong TicketService.
export async function statusSync(_job: Job): Promise<void> {
  await getTicketService().syncToday();
}
