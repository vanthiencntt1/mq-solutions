import { requestCtx, requireApiSession } from '@/app/_lib/session';
import { createFeedbackSchema, feedbackListSchema } from '@/lib/domain/feedback/schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getFeedbackService } from '@/lib/services/feedback';

export const GET = route(async (req) => {
  const session = await requireApiSession(req);
  const query = parseWith(feedbackListSchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getFeedbackService().listMine(session.id, query);
  return ok(
    result.rows.map(({ accountId: _accountId, ...row }) => row),
    {
      page: query.page,
      pageSize: query.pageSize,
      total: result.total,
    },
  );
});

export const POST = route(async (req) => {
  const session = await requireApiSession(req);
  const input = parseWith(createFeedbackSchema, await req.json());
  const result = await getFeedbackService().create(session.id, requestCtx(req).ipHash, input);
  return ok({ id: result.id, status: result.status }, undefined, { status: 201 });
});
