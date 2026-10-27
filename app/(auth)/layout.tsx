import { Logo } from '@/components/layout/logo';
import { Card } from '@/components/ui/card';
import { ProductFrame } from '@/components/ui/product-frame';
import { CalendarCheck2, ClipboardList, ShieldCheck, TicketCheck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page grid min-h-dvh items-center gap-12 py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:py-16">
      <div className="mx-auto w-full max-w-lg">
        <Card variant="panel" className="space-y-8 p-6 shadow-lg md:p-8">
          <Logo />
          {children}
        </Card>
      </div>
      <aside className="hidden space-y-8 lg:block" aria-label="Giới thiệu tiện ích đặt khám">
        <div>
          <p className="text-primary text-sm font-semibold">ĐẶT KHÁM TRỰC TUYẾN</p>
          <h2 className="section-title mt-3">Lịch khám trong tầm tay</h2>
          <p className="text-slate-gray mt-4 text-lg leading-7">
            Chọn giờ khám, theo dõi phiếu và chuẩn bị thông tin trước khi đến cơ sở.
          </p>
        </div>
        <ProductFrame caption="Minh họa phiếu khám">
          <div className="bg-card p-6">
            <div className="border-hairline flex items-center justify-between gap-4 border-b pb-4">
              <span className="flex items-center gap-3">
                <span className="bg-info-bg text-primary grid size-12 place-items-center rounded-lg">
                  <ClipboardList className="size-6" strokeWidth={1.75} aria-hidden />
                </span>
                <strong className="text-xl">Phiếu khám</strong>
              </span>
              <span className="bg-success-bg text-success rounded-full px-3 py-1 text-xs font-semibold">
                Đã đặt lịch
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div>
                <span className="text-slate-gray block text-sm">Chuyên khoa</span>
                <strong>Nội tổng quát</strong>
              </div>
              <div>
                <span className="text-slate-gray block text-sm">Ngày khám</span>
                <strong>Thứ Hai, 09:00</strong>
              </div>
            </div>
            <div className="bg-info-bg mt-5 flex items-center justify-between rounded-xl p-4">
              <span className="text-slate-gray">Số thứ tự</span>
              <strong className="text-primary text-3xl tabular-nums">001</strong>
            </div>
          </div>
        </ProductFrame>
        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <CalendarCheck2 className="text-primary size-5" strokeWidth={1.75} aria-hidden /> Chọn lịch phù
            hợp
          </li>
          <li className="flex items-center gap-3">
            <TicketCheck className="text-primary size-5" strokeWidth={1.75} aria-hidden /> Xem phiếu khám sau
            khi đặt
          </li>
          <li className="flex items-center gap-3">
            <ShieldCheck className="text-primary size-5" strokeWidth={1.75} aria-hidden /> Thông tin tài khoản
            được bảo vệ
          </li>
        </ul>
      </aside>
    </div>
  );
}
