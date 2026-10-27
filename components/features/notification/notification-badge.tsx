'use client';

import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { apiFetch } from '@/components/common/api-client';

/** W08 mục 3: header có thể dùng trực tiếp badge này; số lấy từ cùng truy vấn với danh sách. */
export function NotificationBadge() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    const refresh = () => {
      void apiFetch<{ count: number }>('/api/me/notifications/unread-count')
        .then((result) => setCount(result.count))
        .catch(() => setCount(null));
    };
    refresh();
    window.addEventListener('notifications:changed', refresh);
    return () => window.removeEventListener('notifications:changed', refresh);
  }, []);
  return (
    <Link
      href="/tai-khoan/thong-bao"
      aria-label={count ? `Thông báo, ${count} chưa đọc` : 'Thông báo'}
      className="text-ink-navy hover:bg-pebble relative inline-flex min-h-11 items-center gap-2 rounded-md px-3"
    >
      <Bell size={20} aria-hidden />
      <span>Thông báo</span>
      {count !== null && count > 0 ? (
        <span className="bg-primary text-primary-foreground inline-flex min-w-5 justify-center rounded-full px-1.5 text-xs font-semibold">
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </Link>
  );
}
