import type { Metadata } from 'next';
import { requirePageSession } from '@/app/_lib/session';
import { TicketList } from '@/components/features/ticket/ticket-list';
import { getIdentityService } from '@/lib/services/identity';
import { getTicketService } from '@/lib/services/ticket';
import { ticketListQuerySchema } from '@/lib/services/ticket/ticket-service';

export const metadata: Metadata = { title: 'Phiếu khám', robots: { index: false } };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await requirePageSession();
  const query = ticketListQuerySchema.parse(await searchParams);
  const [result, facilities] = await Promise.all([
    getTicketService().list(session.id, query.tab, query.facility, query.page, query.pageSize),
    getIdentityService().listMyFacilities(session.id),
  ]);
  return (
    <TicketList
      {...result}
      tab={query.tab}
      facility={query.facility}
      page={query.page}
      pageSize={query.pageSize}
      facilities={facilities}
    />
  );
}
