/** Mã quyền dùng trong requireAdminApi/requireAdminPage (A01 mục 2). */
export const PERMISSIONS = {
  DASHBOARD_READ: 'dashboard:read',
  FACILITY_READ: 'facility:read',
  FACILITY_UPDATE: 'facility:update',
  CATALOG_READ: 'catalog:read',
  CATALOG_CLEAR: 'catalog:clear',
  APPOINTMENT_READ: 'appointment:read',
  APPOINTMENT_CANCEL: 'appointment:cancel',
  APPOINTMENT_CHECKIN: 'appointment:checkin',
  PATIENT_READ: 'patient:read',
  PATIENT_RESET_PASSWORD: 'patient:reset-password',
  PAYMENT_READ: 'payment:read',
  REFUND_CREATE: 'refund:create',
  REFUND_APPROVE: 'refund:approve',
  CONTENT_READ: 'content:read',
  CONTENT_WRITE: 'content:write',
  NOTIFICATION_READ: 'notification:read',
  REVIEW_READ: 'review:read',
  REPORT_READ: 'report:read',
  MONITOR_READ: 'monitor:read',
  STAFF_MANAGE: 'staff:manage',
  ADMIN_USERS_MANAGE: 'admin-users:manage',
  AUDIT_READ: 'audit:read',
  CONFIG_UPDATE: 'config:update',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export type AdminRole = { name: string; permissions: readonly string[] };
export type AdminScopeUser = { role: string; facilityId: string | null };

/** Đọc quyền từ AdminRole trong DB; dấu * hoặc module:* chỉ mở đúng module. */
export function can(role: AdminRole, permission: Permission): boolean {
  if (role.name === 'SUPER_ADMIN') return true;
  const [module] = permission.split(':');
  return (
    role.permissions.includes('*') ||
    role.permissions.includes(permission) ||
    role.permissions.includes(`${module}:*`)
  );
}

/** null = toàn hệ thống; [] = cấu hình nhân viên cơ sở thiếu facilityId, phải từ chối. */
export function scopeFacilities(user: AdminScopeUser): string[] | null {
  if (user.facilityId) return [user.facilityId];
  if (user.role === 'FACILITY_STAFF' || user.role === 'FACILITY_MANAGER') return [];
  return null;
}
