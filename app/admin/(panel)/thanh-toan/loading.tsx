import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] space-y-4" aria-busy="true" aria-label="Đang tải thanh toán">
      <div className="bg-pebble h-9 w-64 animate-pulse rounded-md" />
      <Card className="bg-pebble h-28 animate-pulse" />
      <Card className="bg-pebble h-52 animate-pulse" />
    </div>
  );
}
