import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { ConsentManager } from '@/components/features/consent/ConsentManager';
import { DEFAULT_PRIMARY_COLOR } from '@/lib/config/brand-colors';
import type { AnalyticsConfig } from '@/lib/domain/analytics/ports';
import { getAnalyticsService } from '@/lib/services/analytics';
// Be Vietnam Pro tự host qua @fontsource (tệp font nằm trong bundle, không gọi Google lúc build / chạy) – mục 10.3
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/500.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
import '@fontsource/be-vietnam-pro/800.css';
import './globals.css';

export async function generateMetadata(): Promise<Metadata> {
  const path = (await headers()).get('x-pathname')?.split('?')[0] ?? '/';
  const privatePath = ['/admin', '/tai-khoan', '/dat-kham', '/dang-nhap', '/dang-ky', '/quen-mat-khau'].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
  return {
    metadataBase: new URL(process.env.APP_URL ?? 'http://localhost:3000'),
    title: { default: 'MQ Solutions – Đặt lịch khám online', template: '%s | MQ Solutions' },
    description:
      'Đặt khám nhanh, nhận số thứ tự và xem hồ sơ khám bệnh tại các cơ sở y tế với một tài khoản CCCD.',
    alternates: privatePath ? undefined : { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'vi_VN',
      siteName: 'MQ Solutions',
      title: 'MQ Solutions – Đặt lịch khám online',
      description: 'Đặt khám nhanh tại nhiều cơ sở y tế với một tài khoản.',
      url: path,
    },
    robots: { index: !privatePath, follow: !privatePath },
  };
}

export const viewport: Viewport = {
  themeColor: DEFAULT_PRIMARY_COLOR,
  width: 'device-width',
  initialScale: 1,
};

async function AnalyticsBootstrap() {
  const csp = (await headers()).get('Content-Security-Policy') ?? '';
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1] ?? '';
  let config: AnalyticsConfig = { provider: 'OFF' };
  try {
    config = await getAnalyticsService().config();
  } catch {
    // G3ANALYTICS: lỗi cấu hình đo lường không được chặn trang khám bệnh.
  }
  return <ConsentManager config={config} nonce={nonce} />;
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // CSP nonce chỉ hoạt động với render động; đọc request ở root để cả trang tĩnh có nonce (C10, W09).
  await headers();
  return (
    <html lang="vi">
      <body>
        {children}
        <AnalyticsBootstrap />
      </body>
    </html>
  );
}
