import type { Metadata } from 'next';
import { LogoutButton } from '@/components/features/auth/session-buttons';
import { ProfileForm } from '@/components/features/auth/profile-form';
import { PrivacyPanel } from '@/components/features/privacy/privacy-panel';
import { getAuthService } from '@/lib/services/auth';
import { getPrivacyService } from '@/lib/services/privacy';
import { requirePageSession } from '@/app/_lib/session';

export const metadata: Metadata = { title: 'Thông tin cá nhân' };

export default async function ProfilePage() {
  const s = await requirePageSession();
  const [profile, deletionRequestedAt] = await Promise.all([
    getAuthService().getProfile(s.id),
    getPrivacyService().getDeletionRequest(s.id),
  ]);
  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="text-[38px] leading-tight md:text-[50px]">Thông tin cá nhân</h1>
        <p className="text-slate-gray mt-2">
          Kiểm tra thông tin định danh, liên hệ và quyền riêng tư của bạn.
        </p>
      </header>
      <ProfileForm profile={profile} />
      <PrivacyPanel initialRequestedAt={deletionRequestedAt} />
      <div className="flex flex-wrap gap-3">
        <LogoutButton all />
      </div>
    </div>
  );
}
