import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { FacilityEditor } from '@/components/features/admin/facility/facility-editor';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';

export const metadata: Metadata = { title: 'Thêm cơ sở' };

export default async function Page() {
  const admin = await requireAdminPage(PERMISSIONS.FACILITY_UPDATE);
  if (admin.facilityIds !== null) redirect('/admin/co-so');
  return <FacilityEditor editable />;
}
