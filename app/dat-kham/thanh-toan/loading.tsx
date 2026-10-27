import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16" aria-label="Đang tải thông tin thanh toán">
      <div className="bg-pebble h-9 w-2/3 animate-pulse rounded-lg" />
      <Card className="grid gap-8 md:grid-cols-2">
        <div className="bg-pebble aspect-square animate-pulse rounded-xl" />
        <div className="space-y-5">
          <div className="bg-pebble h-8 w-3/4 animate-pulse rounded-lg" />
          <div className="bg-pebble h-20 animate-pulse rounded-lg" />
          <div className="bg-pebble h-20 animate-pulse rounded-lg" />
        </div>
      </Card>
    </div>
  );
}
