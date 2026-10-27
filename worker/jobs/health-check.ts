import type { Job } from 'bullmq';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

// C09 mục 1: scheduler đã chạy mỗi phút; mỗi cơ sở có health và SyncLog riêng.
export async function healthCheck(_job: Job): Promise<void> {
  await getAdminFacilityService().checkAll();
}
