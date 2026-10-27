import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminPasswordForm } from '@/components/features/admin/auth/admin-password-form';

export const metadata: Metadata = { title: 'Đổi mật khẩu quản trị' };
export default async function Page() {
  await requireAdminPage();
  return <AdminPasswordForm />;
}
