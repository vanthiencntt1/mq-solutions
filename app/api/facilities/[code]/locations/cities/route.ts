import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
export const GET = route(async (_req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(z.object({ code: z.string().min(2).max(30) }), await ctx.params);
  return ok(await getCatalogService().locations(code, 'cities'));
});
