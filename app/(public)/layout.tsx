import { AutoBreadcrumb } from '@/components/layout/auto-breadcrumb';
import { FloatingActions } from '@/components/layout/floating-actions';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SitePopup } from '@/components/features/site/popup';
import { SiteBannerPlacement } from '@/components/features/site/banner-carousel';
import { getSiteContentService, getSiteSettings } from '@/lib/services/site-content';
import type { CSSProperties } from 'react';

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const service = getSiteContentService();
  const settings = await getSiteSettings();
  const [shellResult, popupResult, bannerResult] = await Promise.allSettled([
    service.shell(settings),
    service.allActivePopups(),
    service.allActiveBanners(),
  ]);
  const shell = shellResult.status === 'fulfilled' ? shellResult.value : undefined;
  const popups = popupResult.status === 'fulfilled' ? popupResult.value : [];
  const banners = bannerResult.status === 'fulfilled' ? bannerResult.value : [];
  // A11 mục 1: chỉ đưa mã hex đã kiểm tra vào CSS variable của bố cục công khai.
  const color = /^#[0-9a-fA-F]{6}$/.test(settings.brand.primaryColor)
    ? settings.brand.primaryColor
    : '#006bff';
  const hover = /^#[0-9a-fA-F]{6}$/.test(settings.brand.primaryHoverColor)
    ? settings.brand.primaryHoverColor
    : '#004eba';
  const theme = { '--primary': color, '--primary-hover': hover } as CSSProperties;
  return (
    <div style={theme}>
      <SiteHeader shell={shell} />
      <main id="noi-dung" className="min-h-[50dvh]">
        <AutoBreadcrumb baseUrl={process.env.APP_URL ?? 'http://localhost:3000'} />
        <SiteBannerPlacement banners={banners} />
        {children}
      </main>
      <SiteFooter shell={shell} />
      <MobileTabBar />
      <FloatingActions shell={shell} />
      <SitePopup popups={popups} />
    </div>
  );
}
