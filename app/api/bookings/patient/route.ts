import { z } from 'zod';
import { requireApiSession } from '@/app/_lib/session';
import { patientAddressSchema } from '@/lib/domain/booking/confirm';
import { ok, parseWith, route } from '@/lib/http/api';
import { getBookingService } from '@/lib/services/booking';

export const POST = route(async (req) => {
  const session = await requireApiSession(req);
  const input = parseWith(z.object({ draftId: z.uuid(), address: patientAddressSchema }), await req.json());
  await getBookingService().saveAddress(session.id, input.draftId, input.address);
  return ok({ saved: true });
});
