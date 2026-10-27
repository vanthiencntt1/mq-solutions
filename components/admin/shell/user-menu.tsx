'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, KeyRound, Moon, Sun } from 'lucide-react';
import { AdminLogoutButton } from '@/components/features/admin/auth/admin-logout-button';

export function UserMenu({ name, role }: { name: string; role: string }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try { setDark(localStorage.getItem('admin-theme') === 'dark'); } catch { /* lưu trữ bị khóa */ }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('admin-theme', dark ? 'dark' : 'light'); } catch { /* lưu trữ bị khóa */ }
  }, [dark, ready]);
  useEffect(() => {
    if (!open) return;
    function close(event: KeyboardEvent) { if (event.key === 'Escape') setOpen(false); }
    function outside(event: PointerEvent) { if (panelRef.current && !panelRef.current.contains(event.target as Node)) setOpen(false); }
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  const initials = name.trim().split(/\s+/).slice(-2).map((part) => part[0]?.toUpperCase()).join('') || 'MQ';
  return <div ref={panelRef} className="relative">
    <button type="button" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)}
      className="text-ink-navy hover:bg-pebble flex h-10 items-center gap-1 rounded-md px-1.5">
      <span className="bg-secondary text-secondary-foreground flex size-8 items-center justify-center rounded-full text-xs font-bold">{initials}</span>
      <ChevronDown size={14} className="text-slate-gray hidden sm:block" aria-hidden />
      <span className="sr-only">Menu người dùng</span>
    </button>
    {open && <div role="menu" className="bg-card border-border absolute top-12 right-0 z-50 w-64 rounded-lg border p-2 shadow-lg">
      <div className="border-border border-b px-2 py-2.5">
        <p className="text-ink-navy truncate text-sm font-semibold">{name}</p>
        <p className="text-slate-gray truncate text-xs">{role}</p>
      </div>
      <Link role="menuitem" href="/admin/dang-nhap/doi-mat-khau" onClick={() => setOpen(false)} className="text-ink-navy hover:bg-pebble flex min-h-10 items-center gap-2 rounded-md px-2 text-sm"><KeyRound size={16} />Đổi mật khẩu</Link>
      <button role="menuitemcheckbox" aria-checked={dark} type="button" onClick={() => setDark((value) => !value)} className="text-ink-navy hover:bg-pebble flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left text-sm">
        {dark ? <Sun size={16} /> : <Moon size={16} />}{dark ? 'Giao diện sáng' : 'Giao diện tối'}
      </button>
      <div className="border-border border-t px-1 pt-2"><AdminLogoutButton /></div>
    </div>}
  </div>;
}
