import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

/** Vệt màu mờ chỉ dùng làm nền trang trí sau giao diện sản phẩm. */
export function DecorBlob({
  tone,
  className,
  ...props
}: Omit<ComponentProps<'span'>, 'children'> & { tone: 'magenta' | 'cyan' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute size-40 rounded-full opacity-30 blur-3xl md:size-56',
        tone === 'magenta' ? 'bg-coral-magenta' : 'bg-sky-cyan',
        className,
      )}
      {...props}
    />
  );
}
