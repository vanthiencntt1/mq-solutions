import type { AnalyticsConfig, AnalyticsSettingsPort } from '@/lib/domain/analytics/ports';

export class AnalyticsService {
  constructor(
    private readonly settings: AnalyticsSettingsPort,
    private readonly umamiOrigin: string | undefined,
  ) {}

  async config(): Promise<AnalyticsConfig> {
    const { analytics, seo } = await this.settings.read();
    if (analytics.provider === 'GA4' && /^G-[A-Z0-9]{4,20}$/.test(seo.ga4Id))
      return { provider: 'GA4', measurementId: seo.ga4Id };
    if (analytics.provider === 'UMAMI' && this.umamiOrigin && analytics.umamiWebsiteId) {
      return { provider: 'UMAMI', origin: this.umamiOrigin, websiteId: analytics.umamiWebsiteId };
    }
    // A11: cấu hình chưa đủ thì tắt thu thập, không tự chọn nhà cung cấp khác.
    return { provider: 'OFF' };
  }
}
