import { requireApiSession } from '@/app/_lib/session';
import { ok, parseWith, route } from '@/lib/http/api';
import { getReviewService } from '@/lib/services/review';
import { CreateReviewSchema, PublicReviewsQuerySchema } from '@/lib/services/review/types';

export const GET = route(async (req) => {
  const query = parseWith(PublicReviewsQuerySchema, Object.fromEntries(new URL(req.url).searchParams));
  const result = await getReviewService().published(query.facilityCode, query.page, query.pageSize);
  return ok(result, { page: query.page, pageSize: query.pageSize, total: result.summary.count });
});

export const POST = route(async (req) => {
  const session = await requireApiSession(req);
  const input = parseWith(CreateReviewSchema, await req.json());
  return ok(await getReviewService().create(session.id, input), undefined, { status: 201 });
});
