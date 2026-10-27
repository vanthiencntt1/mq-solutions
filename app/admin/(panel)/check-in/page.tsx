import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { CheckInPanel } from '@/components/features/admin/appointments/check-in-panel';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';

export const metadata: Metadata = { title: 'Check-in QR' };

export default async function Page() {
  await requireAdminPage(PERMISSIONS.APPOINTMENT_CHECKIN);
  return <CheckInPanel />;
}
