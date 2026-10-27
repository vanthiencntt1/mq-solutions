import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Ô icon xanh trong nền thông tin, dùng cùng icon lucide nét mảnh. */
export function IconTile({
  children,
  size = 'md',
  className,
  ...props
}: ComponentProps<'span'> & { children: ReactNode; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 'size-10 [&_svg]:size-5',
    md: 'size-12 [&_svg]:size-6',
    lg: 'size-14 [&_svg]:size-7',
  };
  return (
    <span
      className={cn(
        'bg-info-bg text-primary inline-flex shrink-0 items-center justify-center rounded-lg [&_svg]:stroke-[1.75]',
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
