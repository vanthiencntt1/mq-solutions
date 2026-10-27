import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
const paramsSchema = z.object({ code: z.string().min(2).max(30) });
const querySchema = z.object({ specialty: z.string().max(80).optional() });

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(paramsSchema, await ctx.params);
  const { specialty } = parseWith(querySchema, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getCatalogService().rooms(code, specialty));
});
