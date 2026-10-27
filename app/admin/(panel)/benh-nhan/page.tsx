import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminPatientSearch } from '@/components/features/admin/patients/admin-patient-search';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';

export const metadata: Metadata = { title: 'Tài khoản bệnh nhân' };

export default async function Page() {
  const admin = await requireAdminPage(PERMISSIONS.PATIENT_READ);
  return <AdminPatientSearch central={admin.facilityIds === null} />;
}
