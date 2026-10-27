import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Khai báo cỡ chữ tùy biến (globals.css @theme) để tailwind-merge không nhầm `text-body-sm` là màu chữ
// rồi xóa mất `text-primary-foreground`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'caption',
            'body-sm',
            'body',
            'body-lg',
            'subheading',
            'heading-sm',
            'heading',
            'heading-lg',
            'display',
          ],
        },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
