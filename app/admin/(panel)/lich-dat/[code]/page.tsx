import type { Metadata } from 'next';
import Link from 'next/link';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AppointmentDetail } from '@/components/features/admin/appointments/appointment-detail';
import { PERMISSIONS, can } from '@/lib/domain/admin/permissions';
import { AppointmentCodeSchema, getAdminAppointmentsService } from '@/lib/services/admin-appointments';

export const metadata: Metadata = { title: 'Chi tiết phiếu khám' };

export default async function Page({ params }: { params: Promise<{ code: string }> }) {
  const actor = await requireAdminPage(PERMISSIONS.APPOINTMENT_READ);
  const { code } = AppointmentCodeSchema.parse(await params);
  const detail = await getAdminAppointmentsService().detail(actor, code);
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <Link className="text-primary text-sm font-semibold" href="/admin/lich-dat">
        ← Danh sách lịch đặt
      </Link>
      <AppointmentDetail
        detail={detail}
        canCancel={can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.APPOINTMENT_CANCEL)}
      />
    </div>
  );
}
