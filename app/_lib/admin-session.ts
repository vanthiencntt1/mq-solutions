import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { NextResponse } from 'next/server';
import { ADMIN_COOKIE } from '@/lib/config/cookies';
import { AppError } from '@/lib/domain/errors';
import type { Permission } from '@/lib/domain/admin/permissions';
import { getAdminAuthService, type AdminPrincipal } from '@/lib/services/admin-auth';

function cookieFromRequest(req: Request): string | undefined {
  return req.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`))?.[1];
}

export function adminCookie(req: Request): string | undefined {
  return cookieFromRequest(req);
}

export function setAdminCookie(res: NextResponse, token: string): void {
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 8 * 60 * 60,
  });
}

export function clearAdminCookie(res: NextResponse): void {
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

/**
 * Dùng ở mọi /api/admin/* trước khi truy vấn dữ liệu: `const admin = await requireAdminApi(req, PERMISSIONS.APPOINTMENT_READ)`.
 * `facilityIds === null` là toàn hệ thống; mảng ID phải đưa vào `where: { facilityId: { in: admin.facilityIds } }`.
 * Với URL mang facilityId, từ chối 403 nếu ID không thuộc mảng trước khi đọc/ghi. Mã quyền: xem PERMISSIONS ở lib/domain/admin/permissions.ts.
 */
export async function requireAdminApi(req: Request, permission?: Permission): Promise<AdminPrincipal> {
  const user = await getAdminAuthService().resolve(cookieFromRequest(req), permission);
  if (!user) throw new AppError('UNAUTHENTICATED');
  return user;
}

/** Dùng ở Server Component: `await requireAdminPage(PERMISSIONS.STAFF_MANAGE)`; kiểm quyền và phạm vi như API. */
export async function requireAdminPage(permission?: Permission): Promise<AdminPrincipal> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  let user: AdminPrincipal | null;
  try {
    user = await getAdminAuthService().resolve(token, permission);
  } catch (error) {
    if (error instanceof AppError && error.code === 'FORBIDDEN') redirect('/admin?forbidden=1');
    throw error;
  }
  if (!user) {
    const path = (await headers()).get('x-pathname') ?? '/admin';
    redirect(`/admin/dang-nhap?next=${encodeURIComponent(path)}`);
  }
  return user;
}
