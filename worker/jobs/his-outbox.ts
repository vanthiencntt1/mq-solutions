import type { Job } from 'bullmq';
import { getBookingService } from '@/lib/services/booking';

// C06 mục 4: BookingService đối chiếu GetBooking trước khi gửi lại từng lệnh.
export async function processHisOutbox(_job: Job): Promise<void> {
  await getBookingService().retryDue();
}
