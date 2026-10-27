import { ADMIN_NAV, ADMIN_NAV_GROUPS, type AdminNavItem } from '@/lib/config/site';
import { can, PERMISSIONS, type AdminRole, type Permission } from '@/lib/domain/admin/permissions';

export const NAV_PERMISSION: Record<string, Permission> = {
  '/admin': PERMISSIONS.DASHBOARD_READ,
  '/admin/co-so': PERMISSIONS.FACILITY_READ,
  '/admin/danh-muc': PERMISSIONS.CATALOG_READ,
  '/admin/lich-dat': PERMISSIONS.APPOINTMENT_READ,
  '/admin/check-in': PERMISSIONS.APPOINTMENT_CHECKIN,
  '/admin/thanh-toan': PERMISSIONS.PAYMENT_READ,
  '/admin/benh-nhan': PERMISSIONS.PATIENT_READ,
  '/admin/noi-dung': PERMISSIONS.CONTENT_READ,
  '/admin/thong-bao': PERMISSIONS.NOTIFICATION_READ,
  '/admin/danh-gia': PERMISSIONS.REVIEW_READ,
  '/admin/danh-gia/gop-y': PERMISSIONS.REVIEW_READ,
  '/admin/bao-cao': PERMISSIONS.REPORT_READ,
  '/admin/nguoi-dung': PERMISSIONS.STAFF_MANAGE,
  '/admin/cau-hinh': PERMISSIONS.CONFIG_UPDATE,
};

export function visibleAdminNav(role: AdminRole): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => can(role, NAV_PERMISSION[item.href] ?? PERMISSIONS.CONFIG_UPDATE));
}

export function groupedAdminNav(items: AdminNavItem[]) {
  return ADMIN_NAV_GROUPS.map((name) => ({ name, items: items.filter((item) => item.group === name) }))
    .filter((group) => group.items.length > 0);
}

export function activeAdminHref(pathname: string, items: AdminNavItem[]): string | null {
  return items.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}
