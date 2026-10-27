import { afterEach, describe, expect, it, vi } from 'vitest';
import { configureAnalytics, track } from '@/components/features/analytics/client';
import {
  consentCookieValue,
  parseConsentCookie,
  safePagePath,
  sanitizeEventProps,
} from '@/lib/domain/analytics/privacy';
import { AnalyticsService } from '@/lib/services/analytics/analytics-service';
import { parseSetting } from '@/lib/services/settings/schemas';

afterEach(() => {
  vi.unstubAllGlobals();
  configureAnalytics({ provider: 'OFF' });
});

describe('G3ANALYTICS · đồng ý và dữ liệu gửi đi', () => {
  it('mặc định chưa đồng ý, cookie phiên bản cũ không có hiệu lực và có thể rút đồng ý', () => {
    expect(parseConsentCookie('')).toBe('unset');
    expect(parseConsentCookie('mq_analytics_consent=v0:yes')).toBe('unset');
    expect(parseConsentCookie(`other=1; mq_analytics_consent=${consentCookieValue('accepted')}`)).toBe(
      'accepted',
    );
    expect(parseConsentCookie(`mq_analytics_consent=${consentCookieValue('rejected')}`)).toBe('rejected');
  });

  it('chỉ cho phép thuộc tính hữu hạn, không giữ CCCD/SĐT/họ tên/MaBN/mã phiếu', () => {
    expect(
      sanitizeEventProps('booking_confirmed', {
        payment_method: 'ONLINE',
        object_type: 'BHYT',
        cccd: '012345678901',
        phone: '0912345678',
        fullName: 'Nguyễn Văn A',
        maBN: 'BN123456',
        bookingCode: 'PHIEU123456',
        booking_mode: 'BN123456',
      }),
    ).toEqual({ payment_method: 'ONLINE', object_type: 'BHYT' });
    expect(safePagePath('/tai-khoan/phieu-kham/PHIEU123456')).toBe('/tai-khoan');
    expect(safePagePath('/admin/benh-nhan/123')).toBeNull();
  });

  it('helper không gửi trước đồng ý hoặc trên admin và lọc props ngay khi gửi', () => {
    const gtag = vi.fn();
    const browser = { location: { pathname: '/dat-kham/xac-nhan', origin: 'https://mq.example' }, gtag };
    const cookie = { cookie: 'mq_analytics_consent=v1:no' };
    vi.stubGlobal('window', browser);
    vi.stubGlobal('document', cookie);
    configureAnalytics({ provider: 'GA4', measurementId: 'G-ABC12345' });
    track('booking_confirmed', { payment_method: 'ONLINE', phone: '0912345678' });
    expect(gtag).not.toHaveBeenCalled();

    cookie.cookie = 'mq_analytics_consent=v1:yes';
    track('booking_confirmed', { payment_method: 'ONLINE', phone: '0912345678' });
    expect(gtag).toHaveBeenCalledWith('event', 'booking_confirmed', {
      payment_method: 'ONLINE',
      page_location: 'https://mq.example/dat-kham/:step',
      page_title: 'MQ Solutions',
    });
    browser.location.pathname = '/admin';
    track('payment_success');
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('chỉ kích hoạt provider khi A11 có đủ cấu hình', async () => {
    expect(parseSetting('analytics', {})).toEqual({ provider: 'OFF', umamiWebsiteId: '' });
    expect(() => parseSetting('analytics', { provider: 'UMAMI', umamiWebsiteId: 'not-a-uuid' })).toThrow();
    const settings = {
      read: vi.fn().mockResolvedValue({
        analytics: { provider: 'UMAMI', umamiWebsiteId: '123e4567-e89b-42d3-a456-426614174000' },
        seo: { ga4Id: '' },
      }),
    };
    expect(await new AnalyticsService(settings, undefined).config()).toEqual({ provider: 'OFF' });
    expect(await new AnalyticsService(settings, 'https://stats.example').config()).toEqual({
      provider: 'UMAMI',
      origin: 'https://stats.example',
      websiteId: '123e4567-e89b-42d3-a456-426614174000',
    });
  });
});
