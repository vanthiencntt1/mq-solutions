'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Menu } from 'lucide-react';
import { AdminSidebar } from '@/components/layout/admin-sidebar';
import type { AdminRole } from '@/lib/domain/admin/permissions';
import { AdminBreadcrumb } from './admin-breadcrumb';
import { CommandPalette } from './command-palette';
import { FacilitySelector, type ShellFacility } from './facility-selector';
import { UserMenu } from './user-menu';

export function AdminShell({ children, actor, facilities, initialFacility }: {
  children: React.ReactNode;
  actor: AdminRole & { name: string; role: string; facilityIds: string[] | null };
  facilities: ShellFacility[];
  initialFacility: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [cookieFacility, setCookieFacility] = useState(initialFacility);
  const central = actor.facilityIds === null;
  const fromUrl = params.get('facility');
  const selected = central && facilities.some((facility) => facility.id === (fromUrl ?? cookieFacility))
    ? (fromUrl ?? cookieFacility) : '';
  const closeMobile = useCallback(() => { setMobileOpen(false); menuButtonRef.current?.focus(); }, []);

  useEffect(() => {
    try { setCollapsed(localStorage.getItem('admin-sidebar-collapsed') === '1'); } catch { /* lưu trữ bị khóa */ }
  }, []);
  useEffect(() => {
    if (!central || !cookieFacility || fromUrl || !facilities.some((item) => item.id === cookieFacility)) return;
    const next = new URLSearchParams(params.toString());
    next.set('facility', cookieFacility);
    next.set('facilityId', cookieFacility);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  }, [central, cookieFacility, facilities, fromUrl, params, pathname, router]);
  useEffect(() => {
    if (!central || !fromUrl || !facilities.some((item) => item.id === fromUrl)) return;
    setCookieFacility(fromUrl);
    document.cookie = `admin_facility=${encodeURIComponent(fromUrl)}; Path=/admin; SameSite=Lax; Max-Age=31536000`;
  }, [central, facilities, fromUrl]);

  function toggleSidebar() {
    setCollapsed((value) => {
      try { localStorage.setItem('admin-sidebar-collapsed', value ? '0' : '1'); } catch { /* lưu trữ bị khóa */ }
      return !value;
    });
  }
  function selectFacility(id: string) {
    if (id && !facilities.some((facility) => facility.id === id)) return;
    setCookieFacility(id);
    document.cookie = id
      ? `admin_facility=${encodeURIComponent(id)}; Path=/admin; SameSite=Lax; Max-Age=31536000`
      : 'admin_facility=; Path=/admin; SameSite=Lax; Max-Age=0';
    const next = new URLSearchParams(params.toString());
    if (id) { next.set('facility', id); next.set('facilityId', id); }
    else { next.delete('facility'); next.delete('facilityId'); }
    next.delete('page');
    const query = next.toString();
    router.push(`${pathname}${query ? `?${query}` : ''}`, { scroll: false });
  }

  return <div className="bg-cloud text-foreground min-h-dvh">
    <AdminSidebar role={{ name: actor.role, permissions: actor.permissions }} collapsed={collapsed} onToggle={toggleSidebar} mobileOpen={mobileOpen} onClose={closeMobile} facility={selected} />
    <div className={`min-w-0 transition-[margin] md:ml-[76px] ${collapsed ? '' : 'xl:ml-64'}`}>
      <header className={`border-border bg-card fixed top-0 right-0 left-0 z-30 border-b md:left-[76px] ${collapsed ? '' : 'xl:left-64'}`}>
        <div className="flex min-h-16 items-center gap-2 px-4 lg:gap-4 lg:px-6">
          <button ref={menuButtonRef} type="button" aria-label="Mở điều hướng" onClick={() => setMobileOpen(true)} className="text-ink-navy hover:bg-pebble rounded-md p-2 md:hidden"><Menu size={20} /></button>
          <div className="min-w-0 flex-1"><AdminBreadcrumb /></div>
          <CommandPalette role={{ name: actor.role, permissions: actor.permissions }} />
          <FacilitySelector facilities={facilities} central={central} selected={selected} onChange={selectFacility} />
          <UserMenu name={actor.name} role={actor.role} />
        </div>
      </header>
      <main className="mx-auto min-h-dvh w-full max-w-[1440px] px-4 pt-22 pb-6 md:px-6 md:pt-22">{children}</main>
    </div>
  </div>;
}
