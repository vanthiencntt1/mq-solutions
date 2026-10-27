import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AppointmentList } from '@/components/features/admin/appointments/appointment-list';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppointmentQuerySchema, getAdminAppointmentsService } from '@/lib/services/admin-appointments';

export const metadata: Metadata = { title: 'Lịch đặt & phiếu khám' };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const actor = await requireAdminPage(PERMISSIONS.APPOINTMENT_READ);
  const query = AppointmentQuerySchema.parse(await searchParams);
  const service = getAdminAppointmentsService();
  const [result, facilities] = await Promise.all([service.list(actor, query), service.facilities(actor)]);
  return <AppointmentList result={result} query={query} facilities={facilities} />;
}
