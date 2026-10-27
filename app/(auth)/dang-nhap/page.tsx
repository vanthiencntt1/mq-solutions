import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/login-form';
import { safeNext } from '@/app/_lib/session';

export const metadata: Metadata = { title: 'Đăng nhập', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return <LoginForm siteKey={process.env.TURNSTILE_SITE_KEY || undefined} next={safeNext(next)} />;
}
