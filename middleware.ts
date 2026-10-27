import { NextResponse, type NextRequest } from 'next/server';
import { ADMIN_COOKIE, PATIENT_COOKIE, verifyPatientToken } from '@/lib/infra/auth/patient-token';

const CHANGE_PASSWORD_PATH = '/tai-khoan/doi-mat-khau';

// Chặn sớm ở edge: khu tài khoản cần JWT hợp lệ; admin cần cookie phiên admin.
// Kiểm token_version và quyền chi tiết làm ở tầng services (cần DB).
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPathOrChild(pathname, '/tai-khoan')) {
    const token = req.cookies.get(PATIENT_COOKIE)?.value;
    const secret = process.env.JWT_SECRET;
    const claims = token && secret ? await verifyPatientToken(token, secret) : null;
    if (!claims) return withSecurityHeaders(redirectTo(req, '/dang-nhap', pathname + search));
    // Mật khẩu được cấp (lần đầu / quên mật khẩu) → bắt đổi trước khi dùng các trang khác (C01 mục 5)
    if (claims.mc && pathname !== CHANGE_PASSWORD_PATH) {
      const url = req.nextUrl.clone();
      url.pathname = CHANGE_PASSWORD_PATH;
      url.search = '';
      return withSecurityHeaders(NextResponse.redirect(url));
    }
  }

  if (isPathOrChild(pathname, '/admin') && !isPathOrChild(pathname, '/admin/dang-nhap')) {
    if (!req.cookies.get(ADMIN_COOKIE)?.value)
      return withSecurityHeaders(redirectTo(req, '/admin/dang-nhap', pathname));
  }

  // Cho trang Server Component biết đường dẫn hiện tại (để quay lại sau khi đăng nhập)
  const headers = new Headers(req.headers);
  headers.set('x-pathname', pathname + search);
  const csp = contentSecurityPolicy();
  headers.set('Content-Security-Policy', csp);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

// Next.js 15 tự gắn nonce vào script khi CSP có mặt trên request render động.
// C10 mục 2; W09 mục 5. Turnstile chỉ được nạp từ Cloudflare.
function contentSecurityPolicy() {
  const nonce = btoa(crypto.randomUUID());
  // G3ANALYTICS: chỉ nới origin đã cố định trong môi trường; script vẫn cần nonce lúc tải sau đồng ý.
  const umamiOrigin = (() => {
    try {
      const value = process.env.UMAMI_ORIGIN ?? '';
      return value.startsWith('https://') && new URL(value).origin === value ? ` ${value}` : '';
    } catch {
      return '';
    }
  })();
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com https://www.googletagmanager.com${umamiOrigin}${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://challenges.cloudflare.com https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com${umamiOrigin}`,
    'frame-src https://challenges.cloudflare.com',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function withSecurityHeaders(response: NextResponse) {
  response.headers.set('Content-Security-Policy', contentSecurityPolicy());
  return response;
}

function isPathOrChild(pathname: string, root: string) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function redirectTo(req: NextRequest, path: string, next: string) {
  const url = req.nextUrl.clone();
  url.pathname = path;
  url.search = `?next=${encodeURIComponent(next)}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Mở rộng matcher chỉ để gắn header; luật chặn trong middleware giữ nguyên.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest).*)'],
};
