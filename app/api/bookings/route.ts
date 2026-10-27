import { z } from 'zod';
import { requireApiSession } from '@/app/_lib/session';
import { confirmInputSchema } from '@/lib/domain/booking/confirm';
import { AppError } from '@/lib/domain/errors';
import { ok, parseWith, route } from '@/lib/http/api';
import { getBookingService } from '@/lib/services/booking';

const keySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/);

export const POST = route(async (req) => {
  const session = await requireApiSession(req);
  const input = parseWith(confirmInputSchema, await req.json());
  const key = req.headers.get('Idempotency-Key');
  if (!key) throw new AppError('VALIDATION_FAILED', 'Thiếu Idempotency-Key');
  return ok(
    await getBookingService().confirm(session.id, input.draftId, parseWith(keySchema, key), input.payMethod),
  );
});
