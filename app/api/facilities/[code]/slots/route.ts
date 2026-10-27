import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
const paramsSchema = z.object({ code: z.string().min(2).max(30) });
const querySchema = z.object({ room: z.coerce.number().int().positive(), date: z.iso.date() });

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(paramsSchema, await ctx.params);
  const { room, date } = parseWith(querySchema, Object.fromEntries(new URL(req.url).searchParams));
  const slots = await getCatalogService().slots(code, room, date);
  return ok(slots.map(({ nextNumber: _nextNumber, ...slot }) => slot));
});
