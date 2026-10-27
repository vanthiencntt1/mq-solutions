import { Search, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { IconTile } from './icon-tile';

/** Thông báo khi danh sách trống, có chỗ cho thao tác tiếp theo. */
export function EmptyState({
  title,
  description,
  action,
  icon: Icon = Search,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-hairline bg-card flex flex-col items-center rounded-2xl border px-6 py-10 text-center shadow-sm',
        className,
      )}
    >
      <IconTile size="lg">
        <Icon aria-hidden />
      </IconTile>
      <h3 className="text-ink-navy mt-5 text-2xl font-bold">{title}</h3>
      {description && <p className="text-slate-gray mt-2 max-w-md">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
