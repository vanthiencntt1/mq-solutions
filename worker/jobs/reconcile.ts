import type { Job } from 'bullmq';
import { getReconcileService } from '@/lib/services/reconcile';

// C09 mục 4: REPEATS kích hoạt mỗi 15 phút; service tự chọn cơ sở đến reconcileTime.
export async function reconcile(_job: Job): Promise<void> {
  await getReconcileService().runDue();
}
