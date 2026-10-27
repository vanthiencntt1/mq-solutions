'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { quickAdminDestination } from './admin-command';
import { visibleAdminNav } from './admin-nav';
import type { AdminRole } from '@/lib/domain/admin/permissions';

export function CommandPalette({ role }: { role: AdminRole }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const roleItems = visibleAdminNav(role);
  const quick = quickAdminDestination(query, role);
  const items = [
    ...(quick ? [quick] : []),
    ...roleItems.filter((item) => !query || `${item.label} ${item.doc}`.toLocaleLowerCase('vi-VN').includes(query.trim().toLocaleLowerCase('vi-VN'))),
  ];

  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    document.addEventListener('keydown', shortcut);
    return () => document.removeEventListener('keydown', shortcut);
  }, []);
  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }
    setQuery('');
    setIndex(0);
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
    triggerRef.current?.focus();
  }

  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-label="Tìm nhanh, Ctrl hoặc Command K"
      className="border-border bg-pebble text-slate-gray hover:border-primary flex h-10 min-w-10 items-center gap-2 rounded-md border px-2 text-sm sm:min-w-44 sm:px-3 xl:min-w-64">
      <Search size={16} aria-hidden /><span className="hidden flex-1 text-left sm:inline">Tìm nhanh…</span><kbd className="border-border hidden rounded border bg-card px-1 text-[11px] xl:inline">⌘K</kbd>
    </button>
    {open && <div className="fixed inset-0 z-[70] flex items-start justify-center px-3 pt-[12vh]" onKeyDown={(event) => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
      if (event.key === 'Tab') {
        const controls = dialogRef.current?.querySelectorAll<HTMLElement>('input, button');
        const first = controls?.[0];
        const last = controls?.[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
      if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((current) => Math.min(current + 1, items.length - 1)); }
      if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((current) => Math.max(0, current - 1)); }
      if (event.key === 'Enter' && items[index]) { event.preventDefault(); go(items[index].href); }
    }}>
      <button type="button" tabIndex={-1} aria-label="Đóng tìm nhanh" onClick={() => { setOpen(false); triggerRef.current?.focus(); }} className="bg-ink-navy/45 absolute inset-0" />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="Tìm nhanh trang quản trị" className="bg-card border-border relative w-full max-w-xl overflow-hidden rounded-xl border shadow-lg">
        <div className="border-border flex items-center gap-2 border-b p-3">
          <Command size={18} className="text-slate-gray" aria-hidden />
          <Input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setIndex(0); }} placeholder="Tên trang, mã phiếu, CCCD hoặc SĐT" aria-label="Tìm trang hoặc bản ghi" className="h-10 border-0 shadow-none" />
          <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="text-slate-gray rounded-md p-2"><X size={18} /></button>
        </div>
        <ul role="listbox" aria-label="Kết quả tìm nhanh" className="max-h-[55vh] overflow-y-auto p-2">
          {items.map((item, position) => <li key={item.href} role="option" aria-selected={position === index}>
            <button type="button" onMouseEnter={() => setIndex(position)} onClick={() => go(item.href)} className={`w-full rounded-md px-3 py-2.5 text-left text-sm ${position === index ? 'bg-pebble text-signal-blue' : 'text-ink-navy hover:bg-pebble'}`}>{item.label}</button>
          </li>)}
          {items.length === 0 && <li className="text-slate-gray px-3 py-6 text-center text-sm">Không có kết quả phù hợp.</li>}
        </ul>
      </div>
    </div>}
  </>;
}
