'use client';

import { useEffect, useRef } from 'react';

export function PopoverMenu({
  open,
  onClose,
  label,
  children,
  width = 'w-72',
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      ref.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(),
    );
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      const items = [...(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])];
      if (!items.length) return;
      event.preventDefault();
      const index = items.indexOf(document.activeElement as HTMLElement);
      items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    };
    const pointer = (event: PointerEvent) => {
      if (!ref.current?.parentElement?.contains(event.target as Node)) onClose();
    };
    document.addEventListener('keydown', key);
    document.addEventListener('pointerdown', pointer);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', key);
      document.removeEventListener('pointerdown', pointer);
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={`bg-paper border-hairline fixed inset-x-2 top-16 z-50 max-h-[calc(100dvh-5rem)] animate-[popover-in_120ms_ease-out] overflow-y-auto rounded-2xl border p-2 shadow-sm motion-reduce:animate-none sm:absolute sm:inset-x-auto sm:top-full sm:right-0 sm:mt-2 sm:max-h-[80vh] ${width}`}
    >
      {children}
    </div>
  );
}
