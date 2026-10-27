// G3ANALYTICS · W09 mục 6: tên sự kiện cố định, không mang định danh bệnh nhân.
export const ANALYTICS_EVENTS = [
  'facility_viewed',
  'booking_started',
  'login_completed',
  'booking_confirmed',
  'payment_success',
  'queue_number_ready',
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];
export type AnalyticsProps = Record<string, string | number | boolean>;

export type AnalyticsConfig =
  | { provider: 'OFF' }
  | { provider: 'GA4'; measurementId: string }
  | { provider: 'UMAMI'; origin: string; websiteId: string };

export interface AnalyticsSettingsPort {
  read(): Promise<{
    analytics: { provider: 'OFF' | 'GA4' | 'UMAMI'; umamiWebsiteId: string };
    seo: { ga4Id: string };
  }>;
}
