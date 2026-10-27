import { z } from 'zod';
import { requestCtx, requireApiSession } from '@/app/_lib/session';
import { parseWith, route } from '@/lib/http/api';
import { getRecordsService } from '@/lib/services/records';

export const dynamic = 'force-dynamic';
const Params = z.object({ signedToken: z.string().regex(/^[0-9a-f-]{36}\.[0-9a-f]{32}$/) });

// C04 mục 5: token ký HMAC giữ trong Redis 5 phút, ràng buộc tài khoản và định danh lại trước khi trả file.
export const GET = route(async (req, ctx: { params: Promise<{ signedToken: string }> }) => {
  const s = await requireApiSession(req);
  const { signedToken } = parseWith(Params, await ctx.params);
  const file = await getRecordsService().file(s.id, signedToken, requestCtx(req).ipHash);
  return new Response(new Blob([new Uint8Array(file.data)]), {
    headers: {
      'Content-Type': file.mime,
      'Content-Disposition': 'inline',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex',
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
