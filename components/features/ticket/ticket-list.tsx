import Link from 'next/link';
import { ArrowRight, CalendarDays, ClipboardList, Clock3 } from 'lucide-react';
import type { TicketListItem, TicketTab } from '@/lib/domain/booking/cancel-types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { FacilityLogo } from '@/components/features/identity/facility-logo';
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
  logos,
  tabCounts,
}: {
  rows: TicketListItem[];
  total: number;
  tab: TicketTab;
  page: number;
  pageSize: number;
  facility?: string;
  facilities: { code: string; name: string }[];
  logos: Record<string, string | null>;
  tabCounts: Record<TicketTab, number>;
}) {
  const href = (nextTab: TicketTab, nextPage = 1, nextFacility: string | null | undefined = facility) =>
    `/tai-khoan/phieu-kham?${new URLSearchParams({ tab: nextTab, page: String(nextPage), ...(nextFacility ? { facility: nextFacility } : {}) })}`;
  return (
    <div className="min-w-0 space-y-8 pb-8">
      <header className="space-y-2">
        <h1 className="text-[38px] leading-tight font-bold md:text-[50px]">Phiếu khám của tôi</h1>
        <p className="text-slate-gray">Theo dõi số thứ tự và lịch khám tại mọi cơ sở.</p>
      </header>
      <nav aria-label="Trạng thái phiếu" className="border-hairline flex gap-2 overflow-x-auto border-b pb-3">
        {tabs
          .filter((item) => tabCounts[item.id] > 0 || item.id === tab)
          .map((item) => (
            <Link
              key={item.id}
              href={href(item.id)}
              aria-current={tab === item.id ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center rounded-md px-4 font-semibold whitespace-nowrap ${tab === item.id ? 'bg-info-bg text-info' : 'text-slate-gray hover:bg-pebble'}`}
            >
              {item.label}
            </Link>
          ))}
      </nav>
      {facilities.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo cơ sở">
          <Link
            href={href(tab, 1, null)}
            className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${!facility ? 'border-primary text-primary' : 'border-hairline'}`}
          >
            Tất cả cơ sở
          </Link>
          {facilities.map((f) => (
            <Link
              key={f.code}
              href={href(tab, 1, f.code)}
              className={`inline-flex min-h-11 items-center rounded-full border px-3 text-sm ${facility === f.code ? 'border-primary text-primary' : 'border-hairline'}`}
            >
              {f.name}
            </Link>
          ))}
        </div>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Chưa có phiếu khám trong mục này"
          description="Bạn có thể đặt khám tại cơ sở phù hợp."
          action={
            <Button asChild>
              <Link href="/co-so-y-te">Tìm cơ sở khám</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {rows.map((row) => (
            <Card key={row.code} className="space-y-5 transition-shadow hover:shadow-md">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <FacilityLogo name={row.facilityName} logoUrl={logos[row.facilityCode]} />
                  <div className="min-w-0">
                    <p className="text-slate-gray text-sm">Mã phiếu {row.code}</p>
                    <h2 className="mt-1 text-xl font-bold">{row.facilityName}</h2>
                  </div>
                </div>
                <TicketStatus status={row.status} cancelRequest={row.cancelRequest} />
              </div>
              <div className="border-hairline grid gap-4 border-t pt-5 sm:grid-cols-[1fr_auto]">
                <div className="space-y-2">
                  <p className="flex items-center gap-2">
                    <CalendarDays className="text-primary size-5" aria-hidden />
                    {formatDate(row.examDate)}
                  </p>
                  <p className="flex items-center gap-2">
                    <Clock3 className="text-primary size-5" aria-hidden />
                    {row.slotLabel}
                  </p>
                  <p className="text-slate-gray text-sm">
                    {row.specialtyName} · {row.roomName}
                  </p>
                </div>
                <div className="flex items-end gap-4">
                  {row.stt ? (
                    <div className="text-right">
                      <span className="text-slate-gray text-xs">SỐ THỨ TỰ</span>
                      <p
                        className="text-ink-navy tabular text-5xl leading-none font-bold"
                        aria-label={`Số thứ tự ${row.stt}`}
                      >
                        {row.stt}
                      </p>
                    </div>
                  ) : null}
                  <Button asChild variant="outline">
                    <Link href={`/tai-khoan/phieu-kham/${row.code}`}>
                      Xem phiếu <ArrowRight aria-hidden />
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
