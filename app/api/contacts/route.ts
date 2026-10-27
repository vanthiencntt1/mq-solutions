import { requestCtx } from '@/app/_lib/session';
import { ContactInputSchema } from '@/lib/domain/content/contact';
import { AppError } from '@/lib/domain/errors';
import { ok, parseWith, route } from '@/lib/http/api';
import { getContactService } from '@/lib/services/contact';

// POST /api/contacts – W07 mục 2. Route wrapper kiểm Origin trước khi ghi.
export const POST = route(async (req) => {
  const body: unknown = await req.json().catch(() => {
    throw new AppError('BAD_REQUEST');
  });
  const input = parseWith(ContactInputSchema, body);
  await getContactService().submit(input, requestCtx(req));
  return ok({ received: true });
});
