import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
const paramsSchema = z.object({ code: z.string().min(2).max(30) });
const querySchema = z.object({
  room: z.coerce.number().int().positive().optional(),
  date: z.iso.date().optional(),
  objectType: z.enum(['DICH_VU', 'BHYT']).default('DICH_VU'),
});

export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(paramsSchema, await ctx.params);
  const { room, date, objectType } = parseWith(
    querySchema,
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return ok(await getCatalogService().prices(code, room, date, objectType));
});
