import type { Job } from 'bullmq';
import { AppError } from '@/lib/domain/errors';
import { getNotificationService } from '@/lib/services/notification';
import type { EmailJob } from '@/lib/services/notification/types';

/** A08 mục 3: BullMQ thử lại tối đa 3 lần; log FAILED chỉ sau lần cuối. */
export async function sendEmail(job: Job<EmailJob>): Promise<void> {
  try {
    await getNotificationService().sendEmailJob(job.data);
  } catch {
    if (job.attemptsMade + 1 >= (job.opts.attempts ?? 1))
      await getNotificationService().failEmailJob(job.data);
    // Worker chỉ ghi error.message; SMTP có thể kèm địa chỉ nên thay bằng thông điệp chung.
    throw new AppError('MAIL_SEND_FAILED');
  }
}
