import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';
import { PATIENT_COOKIE, PATIENT_HINT_COOKIE, SESSION_MAX_AGE } from '@/lib/config/cookies';
import { AppError } from '@/lib/domain/errors';
import { getAuthService, hashIp, type SessionAccount } from '@/lib/services/auth';

// Phiên bệnh nhân phía trang / Route Handler (C01 mục 8).

export function requestCtx(req: Request) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'local';
  return { ip, ipHash: hashIp(ip) };
}

const secure = process.env.NODE_ENV === 'production';

export function setSessionCookies(res: NextResponse, token: string, remember: boolean) {
  const maxAge = remember ? SESSION_MAX_AGE.remember : undefined; // không nhớ → cookie phiên trình duyệt (JWT tự hết hạn 12 giờ)
  res.cookies.set(PATIENT_COOKIE, token, { httpOnly: true, secure, sameSite: 'lax', path: '/', maxAge });
  res.cookies.set(PATIENT_HINT_COOKIE, '1', { httpOnly: false, secure, sameSite: 'lax', path: '/', maxAge });
}

export function clearSessionCookies(res: NextResponse) {
  res.cookies.set(PATIENT_COOKIE, '', { path: '/', maxAge: 0 });
  res.cookies.set(PATIENT_HINT_COOKIE, '', { path: '/', maxAge: 0 });
}

/** Route Handler: lấy tài khoản đang đăng nhập hoặc ném 401. `allowMustChange` cho API đổi mật khẩu / đăng xuất. */
export async function requireApiSession(
  req: Request,
  opts: { allowMustChange?: boolean } = {},
): Promise<SessionAccount> {
  const token = req.headers.get('cookie')?.match(new RegExp(`(?:^|; )${PATIENT_COOKIE}=([^;]+)`))?.[1];
  const s = await getAuthService().resolveSession(token);
  if (!s) throw new AppError('UNAUTHENTICATED');
  if (s.mustChangePassword && !opts.allowMustChange) throw new AppError('AUTH_MUST_CHANGE_PASSWORD');
  return s;
}

/** Trang (Server Component) trong khu tài khoản. Hết phiên → về đăng nhập. */
export async function requirePageSession(): Promise<SessionAccount> {
  const token = (await cookies()).get(PATIENT_COOKIE)?.value;
  const s = await getAuthService().resolveSession(token);
  if (!s) {
    const path = (await headers()).get('x-pathname') ?? '/tai-khoan';
    redirect(`/dang-nhap?next=${encodeURIComponent(path)}`);
  }
  return s;
}

/** Chỉ cho phép quay về đường dẫn nội bộ (chống open redirect). */
export function safeNext(next: string | null | undefined, fallback = '/tai-khoan'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  return next;
}
