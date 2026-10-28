import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AccountLayoutFrame } from '@/components/layout/account-layout-frame';

// Khu tài khoản (W08). middleware.ts chặn khi chưa đăng nhập.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <AccountLayoutFrame>{children}</AccountLayoutFrame>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
