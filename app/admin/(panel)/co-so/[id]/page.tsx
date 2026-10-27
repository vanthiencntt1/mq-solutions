import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { FacilityEditor } from '@/components/features/admin/facility/facility-editor';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityIdSchema } from '@/lib/domain/admin/facility-schemas';
import { getAdminFacilityService } from '@/lib/services/admin-facility';

export const metadata: Metadata = { title: 'Chi tiết cơ sở' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage(PERMISSIONS.FACILITY_READ);
  const { id } = FacilityIdSchema.parse(await params);
  const row = await getAdminFacilityService().get(admin, id);
  const editable = can({ name: admin.role, permissions: admin.permissions }, PERMISSIONS.FACILITY_UPDATE);
  return <FacilityEditor initial={row} editable={editable} />;
}
