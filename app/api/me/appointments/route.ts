import { requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getTicketService } from '@/lib/services/ticket';
import { ticketListQuerySchema } from '@/lib/services/ticket/ticket-service';

export const dynamic = 'force-dynamic';

// C08 mục 3: accountId chỉ lấy từ cookie phiên, không nhận từ query.
export const GET = route(async (req) => {
  const session = await requireApiSession(req);
  const query = parseWith(ticketListQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getTicketService().list(
    session.id,
    query.tab,
    query.facility,
    query.page,
    query.pageSize,
  );
  return ok(result.rows, { page: query.page, pageSize: query.pageSize, total: result.total });
});
