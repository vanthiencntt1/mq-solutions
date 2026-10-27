import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/features/auth/change-password-form';
import { requirePageSession } from '@/app/_lib/session';

export const metadata: Metadata = { title: 'Đổi mật khẩu' };

export default async function ChangePasswordPage() {
  const s = await requirePageSession();
  return (
    <div className="space-y-6">
      <h1 className="text-[28px]">Đổi mật khẩu</h1>
      <ChangePasswordForm forced={s.mustChangePassword} />
    </div>
  );
}
