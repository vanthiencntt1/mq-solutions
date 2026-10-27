import { Card } from '@/components/ui/card';

// A10 mục 2: báo cáo tổng hợp có thể mất thời gian; giữ bố cục ổn định khi tải.
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-6" aria-busy="true" aria-label="Đang tải báo cáo">
      <div className="space-y-2">
        <div className="bg-muted h-4 w-32 animate-pulse rounded" />
        <div className="bg-muted h-8 w-72 max-w-full animate-pulse rounded" />
      </div>
      <Card className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="bg-muted h-11 animate-pulse rounded-md" />
        ))}
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="space-y-3 p-4">
            <div className="bg-muted h-4 w-24 animate-pulse rounded" />
            <div className="bg-muted h-7 w-36 animate-pulse rounded" />
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <div className="bg-muted h-56 animate-pulse rounded" />
      </Card>
      <span className="sr-only">Đang tải báo cáo…</span>
    </div>
  );
}
