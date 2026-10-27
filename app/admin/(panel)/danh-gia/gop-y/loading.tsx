import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="space-y-5" role="status" aria-label="Đang tải danh sách góp ý">
      <div className="bg-pebble h-9 w-56 animate-pulse rounded-md" />
      <Card className="bg-pebble h-20 animate-pulse" />
      <Card className="bg-pebble h-40 animate-pulse" />
      <span className="sr-only">Đang tải danh sách góp ý…</span>
    </div>
  );
}
