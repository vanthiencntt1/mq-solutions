import { searchQuerySchema } from '@/lib/domain/search/query';
import { ok, parseWith, route } from '@/lib/http/api';
import { getSearchService } from '@/lib/services/search';
import { requestCtx } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

// W05 mục 3: API dùng cùng service với trang kết quả, hạn mức 30/phút/IP.
export const GET = route(async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const query = parseWith(searchQuerySchema, {
    q: params.get('q'),
    type: params.get('type') ?? undefined,
    page: params.get('page') ?? undefined,
  });
  const result = await getSearchService().search({ ...query, ipHash: requestCtx(req).ipHash });
  return ok(result, { page: result.page, pageSize: result.pageSize, total: result.total });
});
