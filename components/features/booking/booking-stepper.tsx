import { Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

const stages = ['Chọn thông tin khám', 'Hồ sơ', 'Xác nhận', 'Thanh toán'];

export function BookingStepper({ current = 0 }: { current?: number }) {
  return (
    <ol className="grid grid-cols-4 gap-2" aria-label="Các bước đặt khám">
      {stages.map((stage, index) => (
        <li key={stage} className="flex flex-col items-center gap-2 text-center">
          <span
            className={cn(
              'grid size-9 place-items-center rounded-full border text-sm font-semibold',
              index < current && 'border-ink-navy bg-ink-navy text-white',
              index === current && 'border-primary bg-primary text-primary-foreground',
              index > current && 'border-hairline bg-card text-mist-gray',
            )}
            aria-current={index === current ? 'step' : undefined}
          >
            {index < current ? <Check className="size-4" aria-hidden /> : index + 1}
          </span>
          <span
            className={cn(
              'text-xs leading-snug md:text-sm',
              index === current ? 'text-ink-navy font-semibold' : 'text-slate-gray',
            )}
          >
            {stage}
          </span>
        </li>
      ))}
    </ol>
  );
}
