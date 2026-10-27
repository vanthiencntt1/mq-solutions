import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminPatientDetail } from '@/components/features/admin/patients/admin-patient-detail';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppError } from '@/lib/domain/errors';
import { getAdminPatientsService, PatientIdSchema } from '@/lib/services/admin-patients';

export const metadata: Metadata = { title: 'Chi tiết tài khoản bệnh nhân' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminPage(PERMISSIONS.PATIENT_READ);
  const parsed = PatientIdSchema.safeParse(await params);
  if (!parsed.success) notFound();
  const service = getAdminPatientsService();
  try {
    const [patient, appointments, events] = await Promise.all([
      service.detail(admin, parsed.data.id),
      service.appointments(admin, parsed.data.id, 1),
      service.events(admin, parsed.data.id),
    ]);
    const role = { name: admin.role, permissions: admin.permissions };
    return (
      <AdminPatientDetail
        patient={patient}
        appointments={appointments}
        events={events}
        central={admin.facilityIds === null}
        canReveal={admin.facilityIds === null && can(role, PERMISSIONS.AUDIT_READ)}
        canReset={can(role, PERMISSIONS.PATIENT_RESET_PASSWORD)}
      />
    );
  } catch (error) {
    if (error instanceof AppError && error.code === 'NOT_FOUND') notFound();
    throw error;
  }
}
