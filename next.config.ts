import type { NextConfig } from 'next';

// C10 mục 2, W09 mục 5: CSP theo từng request nằm trong middleware để Next gắn nonce cho script.
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['@node-rs/argon2', 'pino', 'bullmq', 'ioredis'],
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Chỉ màn quét QR của nhân viên cần camera (C10 mục 2).
      {
        source: '/admin/check-in',
        headers: [{ key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' }],
      },
    ];
  },
};

export default nextConfig;
