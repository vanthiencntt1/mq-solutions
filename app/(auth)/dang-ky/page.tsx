import type { Metadata } from 'next';
import { RegisterForm } from '@/components/features/auth/register-form';

export const metadata: Metadata = { title: 'Đăng ký tài khoản' };
export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  return <RegisterForm siteKey={process.env.TURNSTILE_SITE_KEY || undefined} />;
}
