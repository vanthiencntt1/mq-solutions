import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { AccountNav } from '@/components/layout/account-nav';

// Khu tài khoản (W08). middleware.ts chặn khi chưa đăng nhập.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <div className="container-page grid min-w-0 gap-8 py-8 md:grid-cols-[240px_minmax(0,1fr)] md:py-12">
        <AccountNav />
        <main id="noi-dung" className="min-w-0">
          {children}
        </main>
      </div>
      <SiteFooter />
      <MobileTabBar />
    </>
  );
}
