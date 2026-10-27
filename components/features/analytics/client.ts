'use client';

import { parseConsentCookie, safePagePath, sanitizeEventProps } from '@/lib/domain/analytics/privacy';
import type { AnalyticsConfig, AnalyticsEvent } from '@/lib/domain/analytics/ports';

type Gtag = (...args: unknown[]) => void;
type Umami = { track: (payload: Record<string, unknown>) => void };
declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
    umami?: Umami;
    mqBeforeUmamiSend?: (_type: string, payload: unknown) => unknown;
  }
}

let activeConfig: AnalyticsConfig = { provider: 'OFF' };
let loadedConfig = '';
type PendingEvent = { event: AnalyticsEvent; data: Record<string, string | number | boolean>; path: string };
let pendingEvents: PendingEvent[] = [];

export function configureAnalytics(config: AnalyticsConfig): void {
  activeConfig = config;
}

function canTrack(): boolean {
  return (
    typeof window !== 'undefined' &&
    parseConsentCookie(document.cookie) === 'accepted' &&
    safePagePath(window.location.pathname) !== null
  );
}

function safeLocation(): string {
  return `${window.location.origin}${safePagePath(window.location.pathname) ?? '/'}`;
}

// W09 mục 6: mọi lời gọi đi qua đây để lọc props, URL và trạng thái đồng ý.
function sendEvent(item: PendingEvent): boolean {
  if (activeConfig.provider === 'GA4') {
    if (!window.gtag) return false;
    window.gtag('event', item.event, {
      ...item.data,
      page_location: `${window.location.origin}${item.path}`,
      page_title: 'MQ Solutions',
    });
    return true;
  } else if (activeConfig.provider === 'UMAMI') {
    if (!window.umami) return false;
    window.umami.track({
      website: activeConfig.websiteId,
      url: item.path,
      title: 'MQ Solutions',
      name: item.event,
      data: item.data,
    });
    return true;
  }
  return false;
}

export function track(event: AnalyticsEvent, props: Record<string, unknown> = {}): void {
  if (!canTrack()) return;
  const item = {
    event,
    data: sanitizeEventProps(event, props),
    path: safePagePath(window.location.pathname) ?? '/',
  };
  if (!sendEvent(item)) pendingEvents = [...pendingEvents.slice(-9), item];
}

export function trackPageView(): void {
  if (!canTrack()) return;
  if (activeConfig.provider === 'GA4') {
    window.gtag?.('event', 'page_view', {
      page_location: safeLocation(),
      page_title: 'MQ Solutions',
    });
  } else if (activeConfig.provider === 'UMAMI') {
    window.umami?.track({
      website: activeConfig.websiteId,
      url: safePagePath(window.location.pathname),
      title: 'MQ Solutions',
    });
  }
}

export function disableAnalytics(config: AnalyticsConfig): void {
  if (typeof window === 'undefined') return;
  if (config.provider === 'GA4') {
    (window as unknown as Record<string, unknown>)[`ga-disable-${config.measurementId}`] = true;
  }
  document.getElementById('mq-analytics-script')?.remove();
  pendingEvents = [];
  activeConfig = { provider: 'OFF' };
}

export function loadAnalytics(config: AnalyticsConfig, nonce: string, onReady: () => void): void {
  if (!canTrack() || config.provider === 'OFF') return;
  // Sau khi rút rồi cấp lại đồng ý, runtime đã tải vẫn dùng được; không gắn script lần hai.
  const configKey = JSON.stringify(config);
  if (loadedConfig && loadedConfig !== configKey && activeConfig.provider !== 'OFF')
    disableAnalytics(activeConfig);
  configureAnalytics(config);
  if (loadedConfig === configKey) {
    onReady();
    return;
  }
  if (document.getElementById('mq-analytics-script')) return;
  const script = document.createElement('script');
  script.id = 'mq-analytics-script';
  script.async = true;
  script.nonce = nonce;
  script.referrerPolicy = 'strict-origin-when-cross-origin';
  if (config.provider === 'GA4') {
    const id = config.measurementId;
    (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push(args);
    };
    window.gtag('js', new Date());
    // Tắt pageview mặc định; thuộc tính GA4 cũng cần tắt Enhanced Measurement cho lịch sử SPA.
    window.gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      page_location: safeLocation(),
      page_title: 'MQ Solutions',
    });
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  } else {
    window.mqBeforeUmamiSend = (_type, payload) => (canTrack() ? payload : false);
    script.src = `${config.origin}/script.js`;
    script.dataset.websiteId = config.websiteId;
    script.dataset.autoTrack = 'false';
    script.dataset.excludeSearch = 'true';
    script.dataset.excludeHash = 'true';
    script.dataset.beforeSend = 'mqBeforeUmamiSend';
  }
  script.onload = () => {
    if (canTrack()) {
      loadedConfig = configKey;
      pendingEvents = pendingEvents.filter((item) => !sendEvent(item));
      onReady();
    }
  };
  document.head.appendChild(script);
}
