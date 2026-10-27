import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { NotificationPanel } from '@/components/features/admin/notification/notification-panel';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getNotificationService } from '@/lib/services/notification';
import { ListQuerySchema } from '@/lib/services/notification/notification-service';

export const metadata: Metadata = { title: 'Thông báo & email' };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdminPage(PERMISSIONS.NOTIFICATION_READ);
  const query = ListQuerySchema.parse(await searchParams);
  const service = getNotificationService();
  const [templates, logs, facilities] = await Promise.all([
    service.listTemplates(),
    service.listEmailLogs(query.page, query.pageSize),
    service.facilities(admin),
  ]);
  const canWrite =
    admin.role === 'SUPER_ADMIN' ||
    admin.permissions.includes('*') ||
    admin.permissions.includes(PERMISSIONS.CONTENT_WRITE) ||
    admin.permissions.includes('content:*');
  return (
    <NotificationPanel
      templates={templates}
      logs={logs.rows.map(({ toHash, ...row }) => ({ ...row, recipient: `***@*** · ${toHash.slice(0, 8)}` }))}
      total={logs.total}
      today={logs.today}
      page={query.page}
      pageSize={query.pageSize}
      facilities={facilities}
      canEditTemplate={canWrite && admin.facilityIds === null}
      canBroadcast={canWrite}
      scoped={admin.facilityIds !== null}
    />
  );
}
