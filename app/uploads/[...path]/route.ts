import { isAppError } from '@/lib/domain/errors';
import { readPublicUpload } from '@/lib/services/upload-service';

// Phục vụ tệp công khai /uploads/... từ <STORAGE_DIR>/public.
// Production: nginx phục vụ thẳng thư mục này (docker/nginx.conf), request không tới Next.js.
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  try {
    const { data, mime } = await readPublicUpload(path);
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': mime,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
        ...(mime === 'image/svg+xml'
          ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" }
          : {}),
      },
    });
  } catch (e) {
    return new Response('Không tìm thấy tệp', { status: isAppError(e) ? e.status : 404 });
  }
}
