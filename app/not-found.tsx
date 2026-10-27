import Link from 'next/link';
import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SITE } from '@/lib/config/site';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60dvh] flex-col items-center justify-center gap-5 py-16 text-center">
      <CircleHelp className="text-primary size-12" strokeWidth={1.5} aria-hidden />
      <p className="text-slate-gray text-sm font-semibold">LỖI 404</p>
      <h1 className="text-[32px] leading-tight md:text-[50px]">Không tìm thấy trang</h1>
      <p className="text-slate-gray max-w-lg">
        Địa chỉ bạn mở có thể đã thay đổi. Hãy về trang chủ hoặc gọi hỗ trợ để được hướng dẫn.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/">Về trang chủ</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={`tel:${SITE.hotline.replace(/\s/g, '')}`}>Gọi {SITE.hotline}</a>
        </Button>
      </div>
    </div>
  );
}
