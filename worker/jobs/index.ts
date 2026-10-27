import type { Job } from 'bullmq';
import { getPaymentService } from '@/lib/services/payment';
import { getReportAlertService } from '@/lib/services/report';
import { QUEUES, type QueueName } from '../queues';
import { healthCheck } from './health-check';
import { processHisOutbox } from './his-outbox';
import { processPaymentExpire } from './payment-expire';
import { reconcile } from './reconcile';
import { remind } from './remind';
import { sendEmail } from './send-email';
import { statusSync } from './status-sync';

type Processor = (job: Job) => Promise<void>;

// C07 xử lý CompletePayment trước các lệnh đặt khám trong cùng hàng đợi gửi lại HIS.
async function retryHis(job: Job) {
  await getPaymentService().retryCompleteDue();
  await processHisOutbox(job);
}

export const PROCESSORS: Record<QueueName, Processor> = {
  [QUEUES.health]: healthCheck,
  [QUEUES.hisRetry]: retryHis,
  [QUEUES.statusSync]: statusSync,
  [QUEUES.reconcile]: reconcile,
  [QUEUES.email]: sendEmail,
  [QUEUES.paymentExpire]: processPaymentExpire,
  [QUEUES.remind]: remind,
  [QUEUES.reportAlert]: async () => {
    await getReportAlertService().check();
  },
};
