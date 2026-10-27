import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { SettingsPanel } from '@/components/features/admin/settings/settings-panel';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getSettingsSecretStatus, getSettingsService } from '@/lib/services/settings';

export const metadata: Metadata = { title: 'Cấu hình hệ thống' };

export default async function Page() {
  const admin = await requireAdminPage(PERMISSIONS.CONFIG_UPDATE);
  // A11 mục 2: quyền config:update chưa đủ để sửa cấu hình toàn hệ thống.
  if (admin.role !== 'SUPER_ADMIN' || admin.facilityIds !== null) redirect('/admin?forbidden=1');
  const settings = await getSettingsService().read();
  return <SettingsPanel initial={settings} secretStatus={getSettingsSecretStatus()} />;
}
