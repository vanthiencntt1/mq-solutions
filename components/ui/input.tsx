import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils/cn';

// Input bo 8 px, cao 44 px, focus viền signal blue (10.6).
export function Input({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'border-input bg-card text-body text-foreground placeholder:text-mist-gray focus-visible:border-primary disabled:bg-muted disabled:text-mist-gray h-11 w-full rounded-md border px-3',
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('text-body-sm text-foreground font-medium', className)} {...props} />;
}
