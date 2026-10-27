import type { Job } from 'bullmq';
import { getTicketService } from '@/lib/services/ticket';

// C08/W08: nhắc trước ngày khám, repository chống gửi lặp cùng ngày.
export async function remind(_job: Job): Promise<void> {
  await getTicketService().remindTomorrow();
}
