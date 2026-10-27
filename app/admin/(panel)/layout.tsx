import type { Metadata } from 'next';
import { Suspense } from 'react';
import { cookies } from 'next/headers';
import { AdminShell } from '@/components/admin/shell/admin-shell';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { getAdminCatalogService } from '@/lib/services/admin-catalog';

export const metadata: Metadata = {
  title: { default: 'Quản trị', template: '%s | Quản trị MQ' },
  robots: { index: false },
};

// Layout admin (A01). middleware.ts chặn khi chưa có phiên admin; production chạy ở tên miền riêng + IP whitelist.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  const facilities = await getAdminCatalogService().listFacilities(admin);
  const initialFacility = (await cookies()).get('admin_facility')?.value ?? '';
  return (
    <Suspense fallback={<div className="bg-cloud min-h-dvh" />}>
      <AdminShell
        actor={{ name: admin.name, role: admin.role, permissions: admin.permissions, facilityIds: admin.facilityIds }}
        facilities={facilities.map(({ id, name }) => ({ id, name }))}
        initialFacility={initialFacility}
      >{children}</AdminShell>
    </Suspense>
  );
}
