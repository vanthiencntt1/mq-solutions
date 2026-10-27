import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
const paramsSchema = z.object({ code: z.string().min(2).max(30) });
const querySchema = z.object({ q: z.string().max(100).default('') });

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(paramsSchema, await ctx.params);
  const { q } = parseWith(querySchema, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getCatalogService().specialties(code, q));
});
