import type { Metadata } from 'next';
import { ContentWorkspace } from '@/components/features/admin/content/content-workspace';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';

export const metadata: Metadata = { title: 'Quản lý nội dung' };

export default async function Page() {
  const admin = await requireAdminPage(PERMISSIONS.CONTENT_READ);
  return (
    <ContentWorkspace
      canWrite={
        can({ name: admin.role, permissions: admin.permissions }, PERMISSIONS.CONTENT_WRITE) &&
        admin.facilityIds === null
      }
    />
  );
}
