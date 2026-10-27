import { suggestQuerySchema } from '@/lib/domain/search/query';
import { ok, parseWith, route } from '@/lib/http/api';
import { getSearchService } from '@/lib/services/search';
import { requestCtx } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

// W05 mục 2: gợi ý tối đa 5 kết quả trong mỗi nhóm, không ghi search_log.
export const GET = route(async (req: Request) => {
  const { q } = parseWith(suggestQuerySchema, { q: new URL(req.url).searchParams.get('q') });
  const result = await getSearchService().suggest(q, requestCtx(req).ipHash);
  return ok(result);
});
