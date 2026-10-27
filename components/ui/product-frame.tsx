import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';
import { DecorBlob } from './decor-blob';

/** Khung giao diện sản phẩm có nền trắng, bóng xanh và vệt màu trang trí. */
export function ProductFrame({
  children,
  caption,
  blobs = true,
  className,
  ...props
}: Omit<ComponentProps<'figure'>, 'children'> & {
  children: ReactNode;
  caption?: ReactNode;
  blobs?: boolean;
}) {
  return (
    <figure className={cn('relative isolate min-w-0', className)} {...props}>
      {blobs && (
        <>
          <DecorBlob tone="magenta" className="-top-6 -right-5 -z-10" />
          <DecorBlob tone="cyan" className="-bottom-7 -left-5 -z-10" />
        </>
      )}
      <div className="border-hairline bg-card relative overflow-hidden rounded-xl border shadow-lg">
        {children}
      </div>
      {caption && (
        <figcaption className="text-caption text-slate-gray mt-3 text-center">{caption}</figcaption>
      )}
    </figure>
  );
}
