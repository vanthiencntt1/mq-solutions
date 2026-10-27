import { bookingDraftInput } from '@/lib/domain/booking/draft';
import { ok, parseWith, route } from '@/lib/http/api';
import { getBookingDraftService } from '@/lib/services/catalog';
import { requireApiSession } from '@/app/_lib/session';

export const POST = route(async (req) => {
  const session = await requireApiSession(req);
  const input = parseWith(bookingDraftInput, await req.json());
  const draft = await getBookingDraftService().save(session.id, input);
  return ok({ id: draft.id, amount: draft.amount, expiresIn: 1800 });
});
