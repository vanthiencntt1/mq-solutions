import { Card } from '@/components/ui/card';

export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Đang tải góp ý">
      <div className="bg-pebble h-9 w-56 animate-pulse rounded-md" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="space-y-4">
          <div className="bg-pebble h-6 w-32 animate-pulse rounded-md" />
          <div className="bg-pebble h-11 animate-pulse rounded-md" />
          <div className="bg-pebble h-11 animate-pulse rounded-md" />
          <div className="bg-pebble h-36 animate-pulse rounded-md" />
        </Card>
        <Card className="space-y-4">
          <div className="bg-pebble h-6 w-32 animate-pulse rounded-md" />
          <div className="bg-pebble h-32 animate-pulse rounded-md" />
        </Card>
      </div>
      <span className="sr-only">Đang tải góp ý…</span>
    </div>
  );
}
