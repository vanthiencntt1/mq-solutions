import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Một số liệu thật cùng nhãn; dùng tabular để các chữ số thẳng hàng. */
export function Stat({
  value,
  label,
  className,
  ...props
}: ComponentProps<'div'> & { value: ReactNode; label: ReactNode }) {
  return (
    <div className={cn('space-y-1', className)} {...props}>
      <p className="text-ink-navy tabular text-heading-sm md:text-heading font-bold">{value}</p>
      <p className="text-slate-gray text-sm md:text-base">{label}</p>
    </div>
  );
}
