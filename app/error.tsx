'use client';

import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/config/site';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center gap-5 py-16 text-center">
      <CircleAlert className="text-danger size-12" strokeWidth={1.5} aria-hidden />
      <p className="text-slate-gray text-sm font-semibold">LỖI HỆ THỐNG</p>
      <h1 className="text-[32px] leading-tight md:text-[50px]">Không thể mở trang này</h1>
      <p className="text-slate-gray max-w-lg">
        Hệ thống đang bận. Bạn có thể thử lại sau ít phút hoặc liên hệ hỗ trợ.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={`tel:${SITE.hotline.replace(/\s/g, '')}`}>Gọi {SITE.hotline}</a>
        </Button>
      </div>
    </div>
  );
}
