import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/** Tiêu đề H2 của một mục, kèm mô tả và hành động tùy chọn. */
export function SectionHeader({
  title,
  description,
  action,
  align = 'center',
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', align === 'center' && 'text-center', className)}>
      <h2 className="section-title">{title}</h2>
      {description && (
        <p className={cn('text-slate-gray max-w-2xl text-base md:text-lg', align === 'center' && 'mx-auto')}>
          {description}
        </p>
      )}
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
