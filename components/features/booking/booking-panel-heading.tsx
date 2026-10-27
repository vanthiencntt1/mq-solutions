import type { LucideIcon } from 'lucide-react';

export function BookingPanelHeading({ title, icon: Icon }: { title: string; icon: LucideIcon }) {
  return (
    <h2 className="text-ink-navy flex items-center gap-3 text-[20px] leading-snug font-bold md:text-[24px]">
      <span className="bg-info-bg text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      {title}
    </h2>
  );
}
