'use client';

import { Bell, ChevronDown, LogOut, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { PopoverMenu } from '@/components/ui/popover-menu';
import { ACCOUNT_NAV } from '@/lib/config/site';
import { ACCOUNT_ICONS } from '@/components/layout/account-nav-icons';
import type { NotificationRow } from '@/lib/domain/ports';

type HeaderProfile = { nameMasked: string; phoneMasked: string; email: string };

export function useLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const logout = useCallback(
    async (all = false) => {
      setBusy(true);
      await apiFetch(all ? '/api/auth/logout-all' : '/api/auth/logout', { method: 'POST' }).catch(
        () => undefined,
      );
      router.replace('/dang-nhap');
      router.refresh();
    },
    [router],
  );
  return { logout, busy };
}

function relativeTime(value: Date | string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`;
  return `${Math.floor(minutes / 1440)} ngày trước`;
}

// Nút trên header: đọc cookie gợi ý `mq_auth` (không bí mật) để trang công khai vẫn render tĩnh.
export function HeaderAuth() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [open, setOpen] = useState<'account' | 'notifications' | null>(null);
  const [profile, setProfile] = useState<HeaderProfile | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);
  const pathname = usePathname();
  const { logout, busy } = useLogout();
  const close = useCallback(() => setOpen(null), []);
  useEffect(() => setLoggedIn(document.cookie.split('; ').some((c) => c === 'mq_auth=1')), [pathname]);
  useEffect(() => {
    close();
  }, [pathname, close]);
  useEffect(() => {
    if (loggedIn) return;
    setDisplayName('');
    setProfile(null);
    setUnread(0);
    setNotifications(null);
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) return;
    void apiFetch<{ displayName: string }>('/api/me/header')
      .then((value) => setDisplayName(value.displayName))
      .catch(() => undefined);
  }, [loggedIn]);
  useEffect(() => {
    if (!loggedIn) return;
    const update = () => {
      if (document.visibilityState === 'visible')
        void apiFetch<{ count: number }>('/api/me/notifications/unread-count')
          .then((v) => setUnread(v.count))
          .catch(() => undefined);
    };
    update();
    document.addEventListener('visibilitychange', update);
    window.addEventListener('notifications:changed', update);
    return () => {
      document.removeEventListener('visibilitychange', update);
      window.removeEventListener('notifications:changed', update);
    };
  }, [loggedIn]);

  function toggle(next: 'account' | 'notifications') {
    setOpen((current) => (current === next ? null : next));
    if (next === 'account' && !profile)
      void apiFetch<HeaderProfile>('/api/me')
        .then(setProfile)
        .catch(() => undefined);
    if (next === 'notifications')
      void apiFetch<{ rows: NotificationRow[]; unread: number }>('/api/me/notifications?page=1&pageSize=5')
        .then((v) => {
          setNotifications(v.rows);
          setUnread(v.unread);
        })
        .catch(() => setNotifications([]));
  }

  if (!loggedIn) {
    return (
      <Button asChild variant="ghost" size="sm">
        <Link href="/dang-nhap">Đăng nhập</Link>
      </Button>
    );
  }
  const visibleName = displayName || profile?.nameMasked || 'Tài khoản';
  const initials = visibleName
    .split(' ')
    .filter(Boolean)
    .map((v) => v[0])
    .filter(Boolean);
  const avatar = initials?.length ? `${initials[0]}${initials[initials.length - 1]}` : 'TK';
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <div className="relative hidden sm:block">
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Thông báo${unread ? `, ${unread} chưa đọc` : ''}`}
          aria-haspopup="menu"
          aria-expanded={open === 'notifications'}
          onClick={() => toggle('notifications')}
        >
          <Bell aria-hidden />
          {unread > 0 && (
            <span className="bg-danger text-paper border-paper absolute top-0 right-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 px-0.5 text-[11px] font-bold">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
        <PopoverMenu open={open === 'notifications'} onClose={close} label="Thông báo" width="w-[360px]">
          <p className="text-ink-navy px-3 py-2 font-semibold">Thông báo</p>
          {notifications === null ? (
            <p className="text-slate-gray px-3 py-3 text-sm">Đang tải…</p>
          ) : notifications.length === 0 ? (
            <p className="text-slate-gray px-3 py-3 text-sm">Chưa có thông báo</p>
          ) : (
            notifications.map((n) => (
              <Link
                key={n.id}
                role="menuitem"
                href={n.link?.startsWith('/') && !n.link.startsWith('//') ? n.link : '/tai-khoan/thong-bao'}
                onClick={close}
                className="hover:bg-pebble focus-visible:ring-signal-blue flex min-h-11 items-start gap-2 rounded-lg px-3 py-2 text-sm focus-visible:ring-2"
              >
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${n.readAt ? 'bg-transparent' : 'bg-signal-blue'}`}
                />
                <span className="min-w-0">
                  <span className={`block truncate ${n.readAt ? '' : 'font-semibold'}`}>{n.title}</span>
                  <span className="text-slate-gray text-xs">{relativeTime(n.createdAt)}</span>
                </span>
              </Link>
            ))
          )}
          <Link
            role="menuitem"
            href="/tai-khoan/thong-bao"
            onClick={close}
            className="text-deep-cobalt hover:bg-pebble flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold"
          >
            Xem tất cả
          </Link>
        </PopoverMenu>
      </div>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label="Tài khoản"
          aria-haspopup="menu"
          aria-expanded={open === 'account'}
          onClick={() => toggle('account')}
        >
          <span className="bg-ink-navy text-paper flex size-8 items-center justify-center rounded-full text-xs font-bold">
            {avatar}
          </span>
          <span className="hidden max-w-28 truncate text-sm md:inline">{visibleName}</span>
          <ChevronDown
            className={`hidden !size-4 transition-transform sm:block ${open === 'account' ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </Button>
        <PopoverMenu open={open === 'account'} onClose={close} label="Tài khoản">
          <div className="border-hairline flex items-center gap-3 border-b px-3 py-3">
            <span className="bg-ink-navy text-paper flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-bold">
              {avatar}
            </span>
            <span className="min-w-0">
              <span className="block truncate font-semibold">{visibleName}</span>
              <span className="text-slate-gray block truncate text-sm">
                {profile?.phoneMasked || profile?.email || ''}
              </span>
            </span>
          </div>
          {ACCOUNT_NAV.filter((item) => item.href !== '/tai-khoan/gop-y').map((item) => {
            const Icon = ACCOUNT_ICONS[item.href] ?? UserRound;
            const active =
              pathname === item.href || (item.href !== '/tai-khoan' && pathname.startsWith(`${item.href}/`));
            return (
              <Link
                key={item.href}
                role="menuitem"
                href={item.href}
                onClick={close}
                aria-current={active ? 'page' : undefined}
                className={`focus-visible:ring-signal-blue hover:bg-pebble flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm focus-visible:ring-2 ${active ? 'bg-info-bg text-deep-cobalt font-semibold' : 'text-ink-navy'}`}
              >
                <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                {item.label}
                {item.href === '/tai-khoan/thong-bao' && unread > 0 && (
                  <span className="bg-danger text-paper ml-auto rounded-full px-2 text-xs font-bold">
                    {unread > 9 ? '9+' : unread}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            role="menuitem"
            disabled={busy}
            onClick={() => {
              setDisplayName('');
              setProfile(null);
              void logout();
            }}
            className="text-danger hover:bg-danger-bg focus-visible:ring-signal-blue border-hairline flex min-h-11 w-full items-center gap-3 rounded-lg border-t px-3 text-left text-sm font-semibold focus-visible:ring-2"
          >
            <LogOut className="size-[18px]" strokeWidth={1.75} aria-hidden />
            Đăng xuất
          </button>
        </PopoverMenu>
      </div>
    </div>
  );
}

export function LogoutButton({ all = false }: { all?: boolean }) {
  const { logout, busy } = useLogout();
  return (
    <Button variant="outline" size="sm" disabled={busy} onClick={() => void logout(all)}>
      <LogOut /> {all ? 'Đăng xuất mọi thiết bị' : 'Đăng xuất'}
    </Button>
  );
}
