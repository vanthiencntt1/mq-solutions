import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
const paramsSchema = z.object({ code: z.string().min(2).max(30) });
const querySchema = z.union([
  z.object({ mode: z.literal('ROOM'), room: z.coerce.number().int().positive() }),
  z.object({ mode: z.literal('DOCTOR'), doctor: z.string().min(1).max(80) }),
]);

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(paramsSchema, await ctx.params);
  const selection = parseWith(querySchema, Object.fromEntries(new URL(req.url).searchParams));
  return ok(await getCatalogService().schedules(code, selection));
});
