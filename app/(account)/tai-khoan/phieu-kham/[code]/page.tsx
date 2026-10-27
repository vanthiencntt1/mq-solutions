import type { Metadata } from 'next';
import { requirePageSession } from '@/app/_lib/session';
import { TicketDetail } from '@/components/features/ticket/ticket-detail';
import { getTicketService } from '@/lib/services/ticket';
import { ticketCodeSchema } from '@/lib/services/ticket/ticket-service';

export const metadata: Metadata = { title: 'Chi tiết phiếu khám', robots: { index: false } };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const session = await requirePageSession();
  const code = ticketCodeSchema.parse((await params).code);
  const ticket = await getTicketService().detail(session.id, code);
  return <TicketDetail ticket={ticket} />;
}
