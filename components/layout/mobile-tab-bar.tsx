'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BookOpen, Home, ClipboardList, Bell, User } from 'lucide-react';

// Thanh điều hướng mobile (W01): Trang chủ · Hướng dẫn · Phiếu khám · Thông báo · Hồ sơ.
const TABS = [
  { href: '/', label: 'Trang chủ', icon: Home },
  { href: '/huong-dan', label: 'Hướng dẫn', icon: BookOpen },
  { href: '/tai-khoan/phieu-kham', label: 'Phiếu khám', icon: ClipboardList },
  { href: '/tai-khoan/thong-bao', label: 'Thông báo', icon: Bell },
  { href: '/tai-khoan', label: 'Hồ sơ', icon: User },
];

export function MobileTabBar({
  hasNewAppointments = false,
  hasUnreadNotifications = false,
}: {
  hasNewAppointments?: boolean;
  hasUnreadNotifications?: boolean;
}) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Điều hướng nhanh"
      className="border-border bg-card fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={
                pathname === href ||
                (href !== '/' && href !== '/tai-khoan' && pathname.startsWith(`${href}/`))
                  ? 'page'
                  : undefined
              }
              className="text-caption text-slate-gray hover:text-primary aria-[current=page]:text-primary flex h-16 flex-col items-center justify-center gap-1"
            >
              <span className="relative">
                <Icon className="size-5" aria-hidden />
                {((href === '/tai-khoan/phieu-kham' && hasNewAppointments) ||
                  (href === '/tai-khoan/thong-bao' && hasUnreadNotifications)) && (
                  <span className="bg-danger absolute -top-1 -right-1 size-2 rounded-full" aria-hidden />
                )}
              </span>
              <span className="truncate">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
