import { CalendarDays, Check, CircleCheck, CreditCard, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const stages = [
  { name: 'Chọn lịch', icon: CalendarDays },
  { name: 'Hồ sơ', icon: UserRound },
  { name: 'Xác nhận', icon: CircleCheck },
  { name: 'Thanh toán', icon: CreditCard },
];

export function BookingStepper({ current = 0 }: { current?: number }) {
  return (
    <div>
      <p
        className="text-primary bg-info-bg rounded-full px-4 py-2 text-sm font-semibold md:hidden"
        aria-live="polite"
      >
        Bước {current + 1}/4 – {stages[current]?.name}
      </p>
      <ol className="hidden grid-cols-4 gap-3 md:grid" aria-label="Các bước đặt khám">
        {stages.map((stage, index) => (
          <li key={stage.name} className="flex items-center gap-3">
            <span
              className={cn(
                'grid size-11 shrink-0 place-items-center rounded-xl border',
                index < current && 'border-primary bg-info-bg text-primary',
                index === current && 'border-primary bg-primary text-primary-foreground shadow-md',
                index > current && 'border-hairline bg-card text-slate-gray',
              )}
              aria-current={index === current ? 'step' : undefined}
            >
              {index < current ? (
                <Check className="size-5" strokeWidth={2} aria-hidden />
              ) : (
                <stage.icon className="size-5" strokeWidth={1.75} aria-hidden />
              )}
            </span>
            <span
              className={cn(
                'text-sm leading-snug',
                index === current ? 'text-ink-navy font-semibold' : 'text-slate-gray',
              )}
            >
              {stage.name}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
