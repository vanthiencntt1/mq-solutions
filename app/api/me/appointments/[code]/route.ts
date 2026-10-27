import { requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getTicketService } from '@/lib/services/ticket';
import { ticketCodeSchema } from '@/lib/services/ticket/ticket-service';

export const dynamic = 'force-dynamic';

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const session = await requireApiSession(req);
  const code = parseWith(ticketCodeSchema, (await ctx.params).code);
  return ok(await getTicketService().detail(session.id, code));
});
