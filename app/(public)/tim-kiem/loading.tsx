import { LoaderCircle } from 'lucide-react';

export default function Loading() {
  return (
    <div className="container-page text-muted-foreground flex items-center gap-3 py-12" role="status">
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> Đang tìm kiếm...
    </div>
  );
}
