import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardList } from 'lucide-react';
import type { TicketListItem, TicketTab } from '@/lib/domain/booking/cancel-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDate } from '@/lib/utils/format';
import { TicketStatus } from './ticket-status';

const tabs: { id: TicketTab; label: string }[] = [
  { id: 'upcoming', label: 'Sắp tới' },
  { id: 'past', label: 'Đã khám' },
  { id: 'cancelled', label: 'Đã hủy' },
];

export function TicketList({
  rows,
  total,
  tab,
  page,
  pageSize,
  facility,
  facilities,
}: {
  rows: TicketListItem[];
  total: number;
  tab: TicketTab;
  page: number;
  pageSize: number;
  facility?: string;
  facilities: { code: string; name: string }[];
}) {
  const href = (nextTab: TicketTab, nextPage = 1, nextFacility = facility) =>
    `/tai-khoan/phieu-kham?${new URLSearchParams({ tab: nextTab, page: String(nextPage), ...(nextFacility ? { facility: nextFacility } : {}) })}`;
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-primary text-sm font-semibold">KHU TÀI KHOẢN</p>
        <h1 className="text-[28px] font-bold">Phiếu khám của tôi</h1>
        <p className="text-slate-gray">Theo dõi số thứ tự và lịch khám tại mọi cơ sở.</p>
      </header>
      <nav aria-label="Trạng thái phiếu" className="border-border flex gap-2 overflow-x-auto border-b pb-2">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={href(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
            className={`rounded-md px-4 py-2 font-semibold whitespace-nowrap ${tab === item.id ? 'bg-info-bg text-info' : 'text-slate-gray hover:bg-muted'}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {facilities.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo cơ sở">
          <Link
            href={href(tab, 1, undefined)}
            className={`rounded-full border px-3 py-1 text-sm ${!facility ? 'border-primary text-primary' : 'border-border'}`}
          >
            Tất cả cơ sở
          </Link>
          {facilities.map((f) => (
            <Link
              key={f.code}
              href={href(tab, 1, f.code)}
              className={`rounded-full border px-3 py-1 text-sm ${facility === f.code ? 'border-primary text-primary' : 'border-border'}`}
            >
              {f.name}
            </Link>
          ))}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <Card className="rounded-2xl py-12 text-center">
          <ClipboardList className="text-primary mx-auto mb-4 size-10" aria-hidden />
          <h2 className="text-lg font-semibold">Chưa có phiếu khám trong mục này</h2>
          <p className="text-slate-gray mt-2">Bạn có thể đặt khám tại cơ sở phù hợp.</p>
          <Button asChild className="mt-6">
            <Link href="/co-so-y-te">Tìm cơ sở khám</Link>
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={row.code} className="rounded-2xl">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-slate-gray text-sm">Mã phiếu {row.code}</p>
                  <h2 className="mt-1 text-lg font-semibold">{row.facilityName}</h2>
                </div>
                <TicketStatus status={row.status} cancelRequest={row.cancelRequest} />
              </div>
              <div className="border-border mt-4 grid gap-3 border-t pt-4 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="text-primary size-5" aria-hidden />
                    {formatDate(row.examDate)} · {row.slotLabel}
                  </p>
                  <p className="text-slate-gray text-sm">
                    {row.specialtyName} · {row.roomName}
                  </p>
                </div>
                <div className="flex items-end gap-4">
                  {row.stt ? (
                    <div className="text-right">
                      <span className="text-slate-gray text-xs">SỐ THỨ TỰ</span>
                      <p className="text-ink-navy text-4xl font-bold">{row.stt}</p>
                    </div>
                  ) : null}
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/tai-khoan/phieu-kham/${row.code}`}>
                      Chi tiết <ArrowRight aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
      {total > pageSize ? (
        <nav aria-label="Phân trang" className="flex items-center justify-between">
          <span className="text-slate-gray text-sm">
            Trang {page} / {Math.ceil(total / pageSize)} · {total} phiếu
          </span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={href(tab, page - 1)}>Trước</Link>
              </Button>
            ) : null}
            {page * pageSize < total ? (
              <Button asChild variant="outline" size="sm">
                <Link href={href(tab, page + 1)}>Sau</Link>
              </Button>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
