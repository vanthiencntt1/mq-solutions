'use client';

import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function PaymentError({ reset }: { error: Error; reset: () => void }) {
  return (
    <Card className="mx-auto max-w-xl space-y-4 text-center">
      <CircleAlert className="text-danger mx-auto size-8" aria-hidden />
      <h1 className="text-xl font-bold">Chưa mở được thông tin thanh toán</h1>
      <p className="text-slate-gray">Vui lòng thử lại hoặc xem phiếu khám trong tài khoản của bạn.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/tai-khoan/phieu-kham">Phiếu khám của tôi</Link>
        </Button>
      </div>
    </Card>
  );
}
