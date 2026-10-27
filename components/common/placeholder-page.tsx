import { Construction } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

// Trang giữ chỗ cho khung: ghi rõ tài liệu tính năng sẽ hiện thực trang này.
export function PlaceholderPage({
  title,
  description,
  docs,
  items,
}: {
  title: string;
  description?: string;
  docs: string[];
  items?: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {docs.map((d) => (
            <Badge key={d} tone="info">
              {d}
            </Badge>
          ))}
          <Badge tone="warning">
            <Construction className="size-3.5" aria-hidden /> Đang xây dựng
          </Badge>
        </div>
        <h1 className="text-[28px] leading-tight md:text-[38px]">{title}</h1>
        {description && <p className="text-slate-gray max-w-2xl">{description}</p>}
      </div>
      {items && items.length > 0 && (
        <Card>
          <h2 className="mb-3 text-[18px] font-semibold">Sẽ có trên trang này</h2>
          <ul className="text-body-sm text-slate-gray list-disc space-y-1 pl-5">
            {items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
