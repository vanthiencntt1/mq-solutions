import Link from 'next/link';
import { can, PERMISSIONS, type AdminRole, type Permission } from '@/lib/domain/admin/permissions';
import { ADMIN_NAV } from '@/lib/config/site';
import { Logo } from './logo';

const NAV_PERMISSION: Record<string, Permission> = {
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
  '/admin/bao-cao': PERMISSIONS.REPORT_READ,
  '/admin/nguoi-dung': PERMISSIONS.STAFF_MANAGE,
  '/admin/cau-hinh': PERMISSIONS.CONFIG_UPDATE,
};

// Admin: cùng token, mật độ dày hơn, không mảng trang trí (10.9).
export function AdminSidebar({ role }: { role: AdminRole }) {
  const items = ADMIN_NAV.filter((item) => can(role, NAV_PERMISSION[item.href] ?? PERMISSIONS.CONFIG_UPDATE));
  return (
    <aside className="border-border bg-card w-full shrink-0 border-b lg:min-h-dvh lg:w-64 lg:border-r lg:border-b-0">
      <div className="border-border hidden h-16 items-center border-b px-4 lg:flex">
        <Logo href="/admin" />
      </div>
      <nav aria-label="Quản trị" className="overflow-x-auto p-2 lg:overflow-visible">
        <ul className="flex gap-1 lg:block lg:space-y-0.5">
          {items.map((i) => (
            <li key={i.href}>
              <Link
                href={i.href}
                className="text-body-sm text-ink-navy hover:bg-muted flex items-center justify-between gap-2 rounded-md px-3 py-2 font-medium whitespace-nowrap"
              >
                {i.label}
                <span className="text-caption text-mist-gray">{i.doc}</span>
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/admin/dang-nhap/doi-mat-khau"
              className="text-body-sm text-ink-navy hover:bg-muted block rounded-md px-3 py-2 font-medium whitespace-nowrap"
            >
              Đổi mật khẩu
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
}
