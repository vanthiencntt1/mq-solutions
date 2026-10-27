import type { Metadata } from 'next';
import { ChangePasswordForm } from '@/components/features/auth/change-password-form';
import { requirePageSession } from '@/app/_lib/session';
import { Card } from '@/components/ui/card';
import { IconTile } from '@/components/ui/icon-tile';
import { LockKeyhole } from 'lucide-react';

export const metadata: Metadata = { title: 'Đổi mật khẩu' };

export default async function ChangePasswordPage() {
  const s = await requirePageSession();
  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="text-[38px] leading-tight md:text-[50px]">Đổi mật khẩu</h1>
        <p className="text-slate-gray mt-2">Đặt mật khẩu mới để bảo vệ tài khoản của bạn.</p>
      </header>
      <Card variant="panel" className="max-w-2xl space-y-6 p-5 sm:p-8">
        <div className="flex items-center gap-3">
          <IconTile>
            <LockKeyhole aria-hidden />
          </IconTile>
          <h2 className="text-2xl font-bold">Mật khẩu tài khoản</h2>
        </div>
        <ChangePasswordForm forced={s.mustChangePassword} />
      </Card>
    </div>
  );
}
