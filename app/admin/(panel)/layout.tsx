import type { Metadata } from 'next';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import { AdminLogoutButton } from '@/components/features/admin/auth/admin-logout-button';
import { requireAdminPage } from '@/app/_lib/admin-session';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Quản trị MQ' },
  robots: { index: false },
};

// Layout admin (A01). middleware.ts chặn khi chưa có phiên admin; production chạy ở tên miền riêng + IP whitelist.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="bg-background text-body-sm flex min-h-dvh flex-col lg:flex-row">
      <AdminSidebar role={{ name: admin.role, permissions: admin.permissions }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-border bg-card flex min-h-16 items-center justify-between gap-4 border-b px-4 py-3 lg:px-6">
          <span className="text-ink-navy font-semibold">Quản trị MQ Solutions</span>
          <div className="flex items-center gap-3">
            <span className="text-caption text-slate-gray hidden text-right sm:block">
              {admin.name}
              <br />
              {admin.role}
            </span>
            <AdminLogoutButton />
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
