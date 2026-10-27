import { PERMISSIONS, can, type AdminRole } from '@/lib/domain/admin/permissions';

export function quickAdminDestination(input: string, role: AdminRole) {
  const value = input.trim();
  if (/^MQ[A-Z0-9]{6,20}$/i.test(value) && can(role, PERMISSIONS.APPOINTMENT_READ)) {
    return { label: `Mở phiếu ${value.toUpperCase()}`, href: `/admin/lich-dat/${encodeURIComponent(value.toUpperCase())}` };
  }
  if ((/^\d{12}$/.test(value) || /^0\d{9}$/.test(value)) && can(role, PERMISSIONS.PATIENT_READ)) {
    return { label: `Tìm bệnh nhân: ${value}`, href: `/admin/benh-nhan?q=${encodeURIComponent(value)}` };
  }
  return null;
}
