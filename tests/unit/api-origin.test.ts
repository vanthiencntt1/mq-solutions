import { describe, expect, it, vi } from 'vitest';
import { route } from '@/lib/http/api';

describe('Origin của API ghi', () => {
  it('chỉ chạy handler khi Origin khớp cả giao thức, host và cổng', async () => {
    const handler = vi.fn(async () => new Response(null, { status: 204 }));
    const post = route(handler);

    const same = await post(
      new Request('https://mqsolutions.vn/api/test', {
        method: 'POST',
        headers: { Origin: 'https://mqsolutions.vn' },
      }),
      undefined,
    );
    expect(same.status).toBe(204);

    for (const origin of ['http://mqsolutions.vn', 'https://other.vn', 'invalid']) {
      const denied = await post(
        new Request('https://mqsolutions.vn/api/test', { method: 'POST', headers: { Origin: origin } }),
        undefined,
      );
      expect(denied.status).toBe(403);
      expect((await denied.json()).error.code).toBe('FORBIDDEN');
    }
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
