'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell,
  Building2,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  MessageSquare,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { LogoutButton } from '@/components/features/auth/session-buttons';
import { ACCOUNT_NAV } from '@/lib/config/site';
import { cn } from '@/lib/utils/cn';

const ICONS: Record<string, LucideIcon> = {
  '/tai-khoan': LayoutDashboard,
  '/tai-khoan/phieu-kham': ClipboardList,
  '/tai-khoan/co-so': Building2,
  '/tai-khoan/thong-bao': Bell,
  '/tai-khoan/gop-y': MessageSquare,
  '/tai-khoan/thong-tin': UserRound,
  '/tai-khoan/doi-mat-khau': LockKeyhole,
};

export function AccountNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Tài khoản" className="hidden md:block">
      <ul className="border-hairline bg-card space-y-1 rounded-2xl border p-2 shadow-sm">
        {ACCOUNT_NAV.map((item) => {
          const Icon = ICONS[item.href] ?? UserRound;
          const active =
            pathname === item.href || (item.href !== '/tai-khoan' && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'text-body-sm text-ink-navy hover:bg-pebble flex min-h-11 items-center gap-3 rounded-lg px-3 font-medium',
                  active && 'bg-info-bg text-primary font-semibold',
                )}
              >
                <Icon className="size-5 shrink-0 stroke-[1.75]" aria-hidden />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li className="border-hairline border-t px-1 pt-2">
          <LogoutButton />
        </li>
      </ul>
    </nav>
  );
}
