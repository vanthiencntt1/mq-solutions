import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { parseWith, route } from '@/lib/http/api';

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

describe('Lỗi xác thực API', () => {
  it('không trả dữ liệu người nhập trong chi tiết lỗi Zod', async () => {
    const post = route(async () => {
      parseWith(
        z
          .object({ cccd: z.string() })
          .superRefine((value, ctx) =>
            ctx.addIssue({ code: 'custom', message: `CCCD ${value.cccd} của Nguyễn Văn Mẫu không hợp lệ` }),
          ),
        { cccd: '079090000001' },
      );
      return new Response(null, { status: 204 });
    });
    const response = await post(
      new Request('https://mqsolutions.vn/api/test', { method: 'POST' }),
      undefined,
    );
    const body = await response.text();
    expect(response.status).toBe(422);
    expect(body).not.toContain('079090000001');
    expect(body).not.toContain('Nguyễn Văn Mẫu');
    expect(body).not.toContain('details');
  });
});
