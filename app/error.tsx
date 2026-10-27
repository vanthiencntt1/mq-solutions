'use client';

import Link from 'next/link';
import { CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DecorBlob } from '@/components/ui/decor-blob';
import { SITE } from '@/lib/config/site';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container-page flex min-h-[70dvh] flex-col items-center justify-center gap-5 py-16 text-center">
      <div className="relative isolate">
        <DecorBlob tone="magenta" className="-top-5 -right-6 -z-10" />
        <DecorBlob tone="cyan" className="-bottom-5 -left-6 -z-10" />
        <div className="border-hairline bg-paper grid size-28 place-items-center rounded-2xl border shadow-lg">
          <CircleAlert className="text-danger size-16" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
      <p className="text-slate-gray text-sm font-semibold">LỖI HỆ THỐNG</p>
      <h1 className="text-[42px] leading-tight md:text-[68px]">Không thể mở trang này</h1>
      <p className="text-slate-gray max-w-lg">
        Hệ thống đang bận. Bạn có thể thử lại sau ít phút hoặc liên hệ hỗ trợ.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>Thử lại</Button>
        <Button asChild variant="outline">
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/dat-kham">Đặt khám</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={`tel:${SITE.hotline.replace(/\s/g, '')}`}>Gọi {SITE.hotline}</a>
        </Button>
      </div>
    </main>
  );
}
