'use client';

import { CircleAlert, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

// A10 mục 2: không đưa lỗi truy vấn hoặc thông tin nội bộ ra màn hình admin.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-[600px] p-6" role="alert">
      <CircleAlert size={24} className="text-danger" aria-hidden="true" />
      <h1 className="mt-3 text-xl font-bold">Chưa tải được báo cáo</h1>
      <p className="text-slate-gray mt-2 text-sm">Vui lòng thử lại sau ít phút.</p>
      <Button type="button" size="md" onClick={reset} className="mt-5">
        <RotateCcw size={16} aria-hidden="true" />
        Tải lại
      </Button>
    </Card>
  );
}
