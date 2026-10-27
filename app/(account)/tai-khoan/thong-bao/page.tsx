import type { Metadata } from 'next';
import { requirePageSession } from '@/app/_lib/session';
import { NotificationList } from '@/components/features/notification/notification-list';
import { getNotificationService } from '@/lib/services/notification';
import { ListQuerySchema } from '@/lib/services/notification/notification-service';

export const metadata: Metadata = { title: 'Thông báo', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requirePageSession();
  const query = ListQuerySchema.parse(await searchParams);
  const result = await getNotificationService().list(session.id, query.page, query.pageSize);
  return <NotificationList {...result} page={query.page} pageSize={query.pageSize} />;
}
