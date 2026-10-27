import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '@/middleware';
import nextConfig from '@/next.config';

describe('C10 header bảo mật', () => {
  it('CSP cấp nonce riêng mỗi request và không mở script unsafe-inline', async () => {
    const first = await middleware(new NextRequest('https://mqsolutions.vn/co-so-y-te'));
    const second = await middleware(new NextRequest('https://mqsolutions.vn/co-so-y-te'));
    const csp = first.headers.get('Content-Security-Policy') ?? '';
    expect(csp).toMatch(/script-src[^;]*'nonce-[^']+'/);
    expect(csp.split(';').find((part) => part.includes('script-src'))).not.toContain('unsafe-inline');
    expect(csp).toContain("frame-ancestors 'none'");
    expect(second.headers.get('Content-Security-Policy')).not.toBe(csp);
  });

  it('camera chỉ được cấp riêng cho trang check-in', async () => {
    const rules = await nextConfig.headers?.();
    expect(rules?.[0]?.headers).toContainEqual({
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    });
    expect(rules?.[1]?.source).toBe('/admin/check-in');
    expect(rules?.[1]?.headers).toContainEqual({
      key: 'Permissions-Policy',
      value: 'camera=(self), microphone=(), geolocation=()',
    });
  });

  it('mở rộng matcher không chặn các đường dẫn có tiền tố gần giống admin hoặc tài khoản', async () => {
    const admin = await middleware(new NextRequest('https://mqsolutions.vn/administrator'));
    const account = await middleware(new NextRequest('https://mqsolutions.vn/tai-khoan-khac'));
    expect(admin.status).toBe(200);
    expect(account.status).toBe(200);
    expect(admin.headers.get('Content-Security-Policy')).toContain('script-src');

    const protectedAdmin = await middleware(new NextRequest('https://mqsolutions.vn/admin/dang-nhap-khac'));
    expect(protectedAdmin.status).toBe(307);
    expect(protectedAdmin.headers.get('location')).toContain('/admin/dang-nhap?next=');
  });
});
