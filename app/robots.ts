import type { MetadataRoute } from 'next';

// W09 mục 4: bot không lập chỉ mục khu riêng tư và API.
export default function robots(): MetadataRoute.Robots {
  const base = process.env.APP_URL ?? 'http://localhost:3000';
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/tai-khoan', '/api', '/dat-kham'] },
    sitemap: new URL('/sitemap.xml', base).toString(),
    host: new URL(base).origin,
  };
}
