import type { Metadata } from 'next';
import { ForgotForm } from '@/components/features/auth/forgot-form';

export const metadata: Metadata = { title: 'Quên mật khẩu', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default function ForgotPage() {
  return <ForgotForm siteKey={process.env.TURNSTILE_SITE_KEY || undefined} />;
}
