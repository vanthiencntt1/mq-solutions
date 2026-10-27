import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminLoginForm } from '@/components/features/admin/auth/admin-login-form';

export const metadata: Metadata = { title: 'Đăng nhập quản trị' };

export default function Page() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
