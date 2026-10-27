import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

// Thẻ trắng bo 16 px, bóng gốc xanh (10.5). Panel lớn dùng rounded-2xl (24 px).
export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div className={cn('border-border bg-card rounded-xl border p-6 shadow-sm', className)} {...props} />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-[20px] leading-snug font-semibold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-body-sm text-muted-foreground', className)} {...props} />;
}
