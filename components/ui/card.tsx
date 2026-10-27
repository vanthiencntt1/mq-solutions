import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

/** Thẻ sản phẩm bo 16px; `panel` dùng cho khối nội dung lớn bo 24px. */
export function Card({
  className,
  variant = 'product',
  ...props
}: ComponentProps<'div'> & { variant?: 'product' | 'panel' }) {
  return (
    <div
      className={cn(
        'border-hairline bg-card border p-6 shadow-sm',
        variant === 'panel' ? 'rounded-2xl' : 'rounded-xl',
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return <h3 className={cn('text-[24px] leading-snug font-bold', className)} {...props} />;
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cn('text-body-sm text-muted-foreground', className)} {...props} />;
}
