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
    <div className="space-y-6">
      <h1 className="text-[28px]">Thông tin cá nhân</h1>
      <ProfileForm profile={profile} />
      <PrivacyPanel initialRequestedAt={deletionRequestedAt} />
      <div className="flex flex-wrap gap-3">
        <LogoutButton all />
      </div>
    </div>
  );
}
