import Link from 'next/link';
import { ArrowDownToLine, CalendarDays, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { formatDate, formatMoney } from '@/lib/utils/format';

interface AppointmentQuery {
  page: number;
  pageSize: number;
  facilityId?: string;
  date?: string;
  specialty?: string;
  status?: string;
  payMethod?: string;
  bookingApi?: string;
  hasHisError?: boolean;
  code?: string;
}

interface Row {
  code: string;
  facilityName: string;
  patientName: string;
  maBN: string | null;
  isNewPatient: boolean;
  examDate: string;
  slotLabel: string;
  specialtyName: string;
  roomName: string;
  stt: number | null;
  status: string;
  payMethod: string;
  amount: number;
  cancelRequest: boolean;
}

const statuses: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  QUA_HAN: 'Quá hạn',
  DA_THANH_TOAN: 'Đã thanh toán',
  DANG_GUI_HIS: 'Đang gửi HIS',
  LOI_HIS: 'Lỗi HIS',
  DA_CO_STT: 'Đã có STT',
  DA_KHAM: 'Đã khám',
  DA_HUY: 'Đã hủy',
  CHO_HOAN_TIEN: 'Chờ hoàn tiền',
  DA_HOAN_TIEN: 'Đã hoàn tiền',
};
const selectClass = 'border-border bg-card text-ink-navy h-11 w-full rounded-md border px-3 text-sm';

function url(query: AppointmentQuery, page?: number, exportFile = false) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query))
    if (value !== undefined && value !== '' && key !== 'pageSize') params.set(key, String(value));
  if (page) params.set('page', String(page));
  else params.delete('page');
  return `${exportFile ? '/api/admin/appointments/export' : '/admin/lich-dat'}?${params}`;
}

export function AppointmentList({
  result,
  query,
  facilities,
}: {
  result: { rows: Row[]; total: number; page: number; pageSize: number };
  query: AppointmentQuery;
  facilities: { id: string; name: string }[];
}) {
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-sm font-semibold">A06 · ĐIỀU PHỐI KHÁM</p>
          <h1 className="text-ink-navy text-[28px] font-bold">Lịch đặt & phiếu khám</h1>
          <p className="text-slate-gray text-sm">
            Theo dõi phiếu, lỗi HIS và yêu cầu hủy trong phạm vi cơ sở của bạn.
          </p>
        </div>
        <Link
          href={url(query, undefined, true)}
          className="border-border bg-card text-ink-navy inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-semibold"
        >
          <ArrowDownToLine size={18} /> Xuất CSV
        </Link>
      </header>
      <Card className="p-4">
        <form method="GET" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <FormField id="a06-code" label="Mã phiếu">
            <input
              id="a06-code"
              name="code"
              defaultValue={query.code ?? ''}
              placeholder="MQ…"
              className={selectClass}
            />
          </FormField>
          <FormField id="a06-facility" label="Cơ sở">
            <select
              id="a06-facility"
              name="facilityId"
              defaultValue={query.facilityId ?? ''}
              className={selectClass}
            >
              <option value="">Tất cả cơ sở</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="a06-date" label="Ngày khám">
            <input
              id="a06-date"
              type="date"
              name="date"
              defaultValue={query.date ?? ''}
              className={selectClass}
            />
          </FormField>
          <FormField id="a06-specialty" label="Khoa">
            <input
              id="a06-specialty"
              name="specialty"
              defaultValue={query.specialty ?? ''}
              className={selectClass}
            />
          </FormField>
          <FormField id="a06-status" label="Trạng thái">
            <select id="a06-status" name="status" defaultValue={query.status ?? ''} className={selectClass}>
              <option value="">Tất cả</option>
              {Object.entries(statuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="a06-pay" label="Thanh toán">
            <select
              id="a06-pay"
              name="payMethod"
              defaultValue={query.payMethod ?? ''}
              className={selectClass}
            >
              <option value="">Tất cả</option>
              <option value="ONLINE">Online</option>
              <option value="AT_FACILITY">Tại viện</option>
            </select>
          </FormField>
          <FormField id="a06-api" label="Kênh đặt">
            <select
              id="a06-api"
              name="bookingApi"
              defaultValue={query.bookingApi ?? ''}
              className={selectClass}
            >
              <option value="">Tất cả</option>
              <option value="PAID">PostBooking</option>
              <option value="UNPAID">PostBooking_Unpaid</option>
            </select>
          </FormField>
          <div className="flex items-end gap-3">
            <label className="text-ink-navy flex h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="hasHisError" value="true" defaultChecked={query.hasHisError} /> Chỉ
              lỗi HIS
            </label>
            <Button type="submit" size="sm">
              <Search size={16} /> Lọc
            </Button>
          </div>
        </form>
      </Card>
      <p className="text-slate-gray text-sm">{result.total} phiếu phù hợp</p>
      {result.rows.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {result.rows.map((row) => (
            <Link
              key={row.code}
              href={`/admin/lich-dat/${row.code}`}
              className="focus-visible:ring-primary rounded-xl focus-visible:ring-2"
            >
              <Card className="h-full p-4 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-ink-navy font-bold">
                      {row.code}{' '}
                      {row.stt !== null ? <span className="text-primary">· STT {row.stt}</span> : null}
                    </p>
                    <p className="text-slate-gray mt-1 text-sm">{row.facilityName}</p>
                  </div>
                  <Badge
                    tone={
                      row.status === 'LOI_HIS'
                        ? 'danger'
                        : row.status === 'DA_CO_STT' || row.status === 'DA_KHAM'
                          ? 'success'
                          : 'warning'
                    }
                  >
                    ● {statuses[row.status] ?? row.status}
                  </Badge>
                </div>
                <div className="border-border mt-4 grid gap-2 border-t pt-3 text-sm sm:grid-cols-2">
                  <p>
                    <CalendarDays className="mr-1 inline size-4" />
                    {formatDate(row.examDate)} · {row.slotLabel}
                  </p>
                  <p>
                    {row.specialtyName} · {row.roomName}
                  </p>
                  <p>
                    {row.patientName}
                    {row.isNewPatient ? ' · BN mới' : row.maBN ? ` · ${row.maBN}` : ''}
                  </p>
                  <p>
                    {row.payMethod === 'ONLINE' ? 'Online' : 'Tại viện'} · {formatMoney(row.amount)}
                  </p>
                </div>
                {row.cancelRequest ? (
                  <p className="text-warning mt-3 text-sm font-semibold">⚠ Có yêu cầu hủy cần xử lý</p>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-slate-gray text-sm">Chưa có phiếu phù hợp bộ lọc.</p>
        </Card>
      )}
      <nav aria-label="Phân trang" className="flex items-center justify-between text-sm">
        <span>
          Trang {result.page} / {Math.max(1, Math.ceil(result.total / result.pageSize))}
        </span>
        <div className="flex gap-4">
          {result.page > 1 ? (
            <Link className="text-primary inline-flex items-center" href={url(query, result.page - 1)}>
              <ChevronLeft size={16} /> Trước
            </Link>
          ) : null}
          {result.page * result.pageSize < result.total ? (
            <Link className="text-primary inline-flex items-center" href={url(query, result.page + 1)}>
              Sau <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
