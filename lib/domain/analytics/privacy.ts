import type { AnalyticsEvent, AnalyticsProps } from './ports';

export const CONSENT_COOKIE = 'mq_analytics_consent';
export const CONSENT_VERSION = 'v1';
export type AnalyticsConsent = 'accepted' | 'rejected' | 'unset';

// C10 mục 2: cookie này chỉ chứa lựa chọn, không chứa định danh và có thể đọc để rút đồng ý.
export function parseConsentCookie(cookieHeader: string): AnalyticsConsent {
  const match = cookieHeader.match(/(?:^|;\s*)mq_analytics_consent=([^;]*)/);
  if (match?.[1] === `${CONSENT_VERSION}:yes`) return 'accepted';
  if (match?.[1] === `${CONSENT_VERSION}:no`) return 'rejected';
  return 'unset';
}

export function consentCookieValue(consent: Exclude<AnalyticsConsent, 'unset'>): string {
  return `${CONSENT_VERSION}:${consent === 'accepted' ? 'yes' : 'no'}`;
}

export function isTrackablePath(path: string): boolean {
  return path === '/' || (!path.startsWith('/admin') && !path.startsWith('/api'));
}

// Chỉ giữ đường dẫn theo mẫu cố định; không gửi query, hash, slug, mã phiếu hoặc ID hồ sơ.
export function safePagePath(path: string): string | null {
  if (!isTrackablePath(path)) return null;
  if (path === '/') return '/';
  if (path.startsWith('/co-so/')) return '/co-so/:slug';
  if (path.startsWith('/co-so-y-te/')) return '/co-so-y-te/:type';
  if (path.startsWith('/tin-tuc/')) return '/tin-tuc/:slug';
  if (path.startsWith('/chuyen-khoa/')) return '/chuyen-khoa/:slug';
  if (path.startsWith('/huong-dan/')) return '/huong-dan/:slug';
  if (path.startsWith('/chinh-sach/')) return '/chinh-sach/:slug';
  if (path.startsWith('/tai-khoan/') || path === '/tai-khoan') return '/tai-khoan';
  if (path.startsWith('/dat-kham/'))
    return path === '/dat-kham/thanh-toan' ? '/dat-kham/thanh-toan' : '/dat-kham/:step';
  const fixed = new Set([
    '/co-so',
    '/co-so-y-te',
    '/tin-tuc',
    '/chuyen-khoa',
    '/huong-dan',
    '/bac-si',
    '/tim-kiem',
    '/hop-tac',
    '/dat-kham',
    '/dang-nhap',
    '/dang-ky',
    '/quen-mat-khau',
  ]);
  return fixed.has(path) ? path : null;
}

// W09 mục 6 / C10 mục 2: danh sách cho phép nghiêm ngặt. Key lạ và giá trị tự do đều bị bỏ.
export function sanitizeEventProps(
  _event: AnalyticsEvent,
  input: Record<string, unknown> = {},
): AnalyticsProps {
  const output: AnalyticsProps = {};
  if (input.payment_method === 'ONLINE' || input.payment_method === 'AT_FACILITY')
    output.payment_method = input.payment_method;
  if (input.booking_mode === 'ROOM' || input.booking_mode === 'DOCTOR')
    output.booking_mode = input.booking_mode;
  if (input.object_type === 'DICH_VU' || input.object_type === 'BHYT') output.object_type = input.object_type;
  return output;
}
