import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

// Badge / chip trạng thái – luôn kèm chữ, không chỉ dựa vào màu (10.2).
const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption font-medium',
  {
    variants: {
      tone: {
        info: 'bg-info-bg text-info',
        success: 'bg-success-bg text-success',
        warning: 'bg-warning-bg text-warning',
        danger: 'bg-danger-bg text-danger',
        neutral: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { tone: 'info' },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
