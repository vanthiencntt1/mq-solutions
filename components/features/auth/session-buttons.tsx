'use client';

import { LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';

// Nút trên header: đọc cookie gợi ý `mq_auth` (không bí mật) để trang công khai vẫn render tĩnh.
export function HeaderAuth() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => setLoggedIn(document.cookie.split('; ').some((c) => c === 'mq_auth=1')), []);

  if (!loggedIn) {
    return (
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/dang-nhap">Đăng nhập</Link>
      </Button>
    );
  }
  return (
    <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
      <Link href="/tai-khoan">
        <UserRound /> Tài khoản
      </Link>
    </Button>
  );
}

export function LogoutButton({ all = false }: { all?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await apiFetch(all ? '/api/auth/logout-all' : '/api/auth/logout', { method: 'POST' }).catch(
          () => undefined,
        );
        router.replace('/dang-nhap');
        router.refresh();
      }}
    >
      <LogOut /> {all ? 'Đăng xuất mọi thiết bị' : 'Đăng xuất'}
    </Button>
  );
}
