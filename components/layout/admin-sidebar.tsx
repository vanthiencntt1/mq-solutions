'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  Bell, BookOpen, Building2, CalendarDays, ChartNoAxesCombined, ChevronLeft, ChevronRight,
  ClipboardCheck, CreditCard, HeartHandshake, LayoutDashboard, Menu, MessageSquareText,
  Settings2, Star, Users, UserRound,
} from 'lucide-react';
import { apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { activeAdminHref, groupedAdminNav, visibleAdminNav } from '@/components/admin/shell/admin-nav';
import type { AdminRole } from '@/lib/domain/admin/permissions';
import type { NavCounts } from '@/lib/domain/admin/nav-counts';
import { cn } from '@/lib/utils/cn';

const ICONS = {
  overview: LayoutDashboard, calendar: CalendarDays, checkin: ClipboardCheck, payment: CreditCard,
  patients: UserRound, reviews: Star, feedback: HeartHandshake, facility: Building2,
  catalog: Menu, content: BookOpen, notification: Bell, report: ChartNoAxesCombined,
  users: Users, settings: Settings2,
} as const;

export function AdminSidebar({
  role, collapsed, onToggle, mobileOpen, onClose, facility,
}: {
  role: AdminRole;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onClose: () => void;
  facility: string;
}) {
  const pathname = usePathname();
  const [counts, setCounts] = useState<NavCounts | null>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const items = visibleAdminNav(role);
  const groups = groupedAdminNav(items);
  const activeHref = activeAdminHref(pathname, items);

  useEffect(() => {
    let mounted = true;
    apiFetch<NavCounts>('/api/admin/nav-counts')
      .then((data) => { if (mounted) setCounts(data); })
      .catch(() => { if (mounted) setCounts(null); });
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    drawerRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab') return;
      const controls = drawerRef.current?.querySelectorAll<HTMLElement>('a, button');
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener('keydown', keys);
    return () => document.removeEventListener('keydown', keys);
  }, [mobileOpen, onClose]);

  return (
    <>
      {mobileOpen && <button type="button" aria-label="Đóng điều hướng" onClick={onClose} className="fixed inset-0 z-40 bg-ink-navy/40 md:hidden" />}
      <aside ref={drawerRef} className={cn(
        'bg-card border-border fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r transition-transform md:w-[76px] md:translate-x-0 xl:w-64',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed && 'xl:w-[76px]',
      )}>
        <div className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4">
          <Link href="/admin" onClick={onClose} className="text-ink-navy flex items-center gap-2 rounded-md font-bold focus-visible:ring-3" aria-label="MQ Solutions - Tổng quan">
            <span className="bg-secondary text-secondary-foreground flex size-9 items-center justify-center rounded-md text-sm">MQ</span>
            {!collapsed && <span className="hidden text-sm tracking-tight xl:block">Solutions</span>}
            <span className="text-sm tracking-tight md:hidden">Solutions</span>
          </Link>
          <button type="button" onClick={onClose} aria-label="Đóng menu" className="text-slate-gray rounded-md p-2 md:hidden"><ChevronLeft size={18} /></button>
        </div>
        <nav aria-label="Điều hướng quản trị" className="min-h-0 flex-1 overflow-y-auto px-2 py-4">
          {groups.map((group) => (
            <div key={group.name} className="mb-5">
              <p className={cn('text-mist-gray px-3 pb-1 text-[11px] font-bold tracking-[0.12em] uppercase md:sr-only xl:not-sr-only', collapsed && 'xl:sr-only')}>{group.name}</p>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon as keyof typeof ICONS] ?? MessageSquareText;
                  const active = activeHref === item.href;
                  const count = counts?.[item.href as keyof NavCounts] ?? 0;
                  const href = facility ? `${item.href}?facility=${encodeURIComponent(facility)}&facilityId=${encodeURIComponent(facility)}` : item.href;
                  return <li key={item.href}>
                    <Link href={href} onClick={onClose} title={`${item.label} · ${item.doc}`} aria-current={active ? 'page' : undefined}
                      className={cn('text-ink-navy hover:bg-pebble relative flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-[13px] font-medium', active && 'bg-pebble font-semibold before:bg-signal-blue before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-full')}>
                      <Icon size={18} className={cn('shrink-0', active ? 'text-signal-blue' : 'text-slate-gray')} aria-hidden />
                      <span className={cn('min-w-0 flex-1 truncate md:sr-only xl:not-sr-only', collapsed && 'xl:sr-only')}>{item.label}</span>
                      {count > 0 && <Badge tone="warning" className={cn('px-1.5 py-0 text-[11px] tabular-nums md:absolute md:right-1 md:top-0 md:px-1 xl:static xl:px-1.5', collapsed && 'xl:absolute xl:right-1 xl:top-0 xl:px-1')}>{count > 99 ? '99+' : count}</Badge>}
                    </Link>
                  </li>;
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-border hidden border-t p-2 xl:block">
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'}
            className="text-slate-gray hover:bg-pebble flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm font-medium">
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            {!collapsed && 'Thu gọn'}
          </button>
        </div>
      </aside>
    </>
  );
}
