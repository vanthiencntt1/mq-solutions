import { z } from 'zod';
import { ok, parseWith, route } from '@/lib/http/api';
import { getCatalogService } from '@/lib/services/catalog';

export const dynamic = 'force-dynamic';
export const GET = route(async (req, ctx: { params: Promise<{ code: string }> }) => {
  const { code } = parseWith(z.object({ code: z.string().min(2).max(30) }), await ctx.params);
  const { district } = parseWith(
    z.object({ district: z.string().min(1).max(80).optional() }),
    Object.fromEntries(new URL(req.url).searchParams),
  );
  return ok(await getCatalogService().locations(code, 'wards', district));
});
