import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { Label } from './input';

// Nhãn + ô nhập + lỗi / gợi ý. Lỗi có chữ, không chỉ báo bằng màu (10.10).
export function FormField({
  id,
  label,
  error,
  hint,
  children,
  className,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-body-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-slate-gray">{hint}</p>
      ) : null}
    </div>
  );
}

export function Alert({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  children: ReactNode;
}) {
  const tones = {
    info: 'bg-info-bg text-info',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
  } as const;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('text-body-sm rounded-md px-4 py-3', tones[tone])}
    >
      {children}
    </div>
  );
}
