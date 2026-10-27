import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminCatalogPanel } from '@/components/features/admin/catalog/admin-catalog-panel';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getAdminCatalogService } from '@/lib/services/admin-catalog';

export const metadata: Metadata = { title: 'Danh mục khám' };

export default async function Page() {
  const admin = await requireAdminPage(PERMISSIONS.CATALOG_READ);
  const facilities = await getAdminCatalogService().listFacilities(admin);
  return (
    <AdminCatalogPanel
      facilities={facilities}
      canClear={can({ name: admin.role, permissions: admin.permissions }, PERMISSIONS.CATALOG_CLEAR)}
    />
  );
}
