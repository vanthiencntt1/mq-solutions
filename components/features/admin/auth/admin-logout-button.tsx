'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';

export function AdminLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function logout() {
    setPending(true);
    setError('');
    try {
      await apiFetch('/api/admin/auth/logout', { method: 'POST' });
      router.replace('/admin/dang-nhap');
      router.refresh();
    } catch {
      setError('Chưa đăng xuất được, vui lòng thử lại');
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex items-center gap-2">
      {error ? (
        <span role="alert" className="text-danger text-xs">
          {error}
        </span>
      ) : null}
      <Button variant="outline" size="sm" onClick={logout} disabled={pending}>
        <LogOut size={16} /> Đăng xuất
      </Button>
    </div>
  );
}
