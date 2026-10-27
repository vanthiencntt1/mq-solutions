import type { Metadata } from 'next';
import { formatInTimeZone } from 'date-fns-tz';
import { Activity, Download, Filter, TrendingUp } from 'lucide-react';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { HealthList } from '@/components/features/admin/report/health-list';
import { ReportTrend } from '@/components/features/admin/report/report-trend';
import { Alert } from '@/components/ui/form-field';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getReportService } from '@/lib/services/report';
import { ReportQuerySchema } from '@/lib/services/report/types';
import { formatDate, formatMoney } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Báo cáo & giám sát' };

type Search = { from?: string; to?: string; period?: string; facilityId?: string };

export default async function Page({ searchParams }: { searchParams: Promise<Search> }) {
  const actor = await requireAdminPage(PERMISSIONS.REPORT_READ);
  const raw = await searchParams;
  const now = new Date();
  const today = formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const from = formatInTimeZone(new Date(now.getTime() - 29 * 86_400_000), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const parsed = ReportQuerySchema.safeParse({
    from: raw.from ?? from,
    to: raw.to ?? today,
    period: raw.period ?? 'day',
    facilityId: raw.facilityId || undefined,
  });
  const service = getReportService();
  const mayMonitor = can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.MONITOR_READ);
  const [facilities, report, health] = await Promise.all([
    service.facilityOptions(actor),
    parsed.success ? service.report(actor, parsed.data) : Promise.resolve(null),
    mayMonitor ? service.health(actor) : Promise.resolve(null),
  ]);
  const params = report
    ? new URLSearchParams({
        from: report.query.from,
        to: report.query.to,
        period: report.query.period,
        ...(report.query.facilityId ? { facilityId: report.query.facilityId } : {}),
      })
    : null;

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header>
        <p className="text-primary text-xs font-semibold">A10 · PHÂN TÍCH</p>
        <h1 className="text-[28px] font-bold">Báo cáo & giám sát</h1>
        <p className="text-slate-gray text-sm">Số liệu đặt khám và thanh toán theo phạm vi được cấp.</p>
      </header>
      <Card className="p-4">
        <form
          method="get"
          className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.3fr_auto]"
        >
          <div>
            <Label htmlFor="from">Từ ngày</Label>
            <Input id="from" name="from" type="date" required defaultValue={raw.from ?? from} />
          </div>
          <div>
            <Label htmlFor="to">Đến ngày</Label>
            <Input id="to" name="to" type="date" required defaultValue={raw.to ?? today} />
          </div>
          <div>
            <Label htmlFor="period">Gom theo</Label>
            <select
              id="period"
              name="period"
              defaultValue={raw.period ?? 'day'}
              className="border-input bg-card h-11 w-full rounded-md border px-3 text-sm"
            >
              <option value="day">Ngày</option>
              <option value="week">Tuần</option>
              <option value="month">Tháng</option>
            </select>
          </div>
          <div>
            <Label htmlFor="facilityId">Cơ sở</Label>
            <select
              id="facilityId"
              name="facilityId"
              defaultValue={raw.facilityId ?? ''}
              className="border-input bg-card h-11 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Tất cả cơ sở được cấp</option>
              {facilities.map((facility) => (
                <option key={facility.id} value={facility.id}>
                  {facility.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="md">
            <Filter size={16} />
            Lọc
          </Button>
        </form>
      </Card>
      {!parsed.success && (
        <Alert tone="danger">Khoảng ngày hoặc bộ lọc không hợp lệ. Chọn tối đa 366 ngày và thử lại.</Alert>
      )}
      {report && (
        <>
          <section aria-label="Tổng hợp báo cáo" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Lịch đặt', report.totals.bookings.toLocaleString('vi-VN')],
              ['Tỷ lệ hủy', `${(report.totals.cancellationRate * 100).toFixed(1)}%`],
              ['Tỷ lệ đến khám', `${(report.totals.attendanceRate * 100).toFixed(1)}%`],
              ['Doanh thu online', formatMoney(report.totals.onlineVnd)],
              ['Hoàn tiền', formatMoney(report.totals.refundedVnd)],
              ['Tỷ lệ lỗi HIS', `${(report.totals.hisErrorRate * 100).toFixed(1)}%`],
            ].map(([label, value]) => (
              <Card key={label} className="p-4">
                <p className="text-slate-gray text-xs font-semibold">{label}</p>
                <p className="mt-2 text-xl font-bold tabular-nums">{value}</p>
              </Card>
            ))}
          </section>
          <Card className="p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp size={18} />
                  <h2 className="text-lg font-semibold">Xu hướng đặt khám</h2>
                </div>
                <p className="text-slate-gray text-xs">Theo ngày tạo phiếu; tách cơ sở trong chú giải.</p>
              </div>
              <a
                href={`/api/admin/reports/export?${params}`}
                className="border-border hover:bg-muted inline-flex h-11 items-center gap-2 rounded-md border px-3 text-sm font-semibold"
              >
                <Download size={16} />
                Xuất CSV
              </a>
            </div>
            <ReportTrend rows={report.bookings} />
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-lg font-semibold">Chi tiết đặt khám</h2>
            <p className="text-slate-gray mb-3 text-xs">
              Theo kỳ, cơ sở, chuyên khoa, đối tượng và hình thức thanh toán. Hiển thị 50 dòng đầu; CSV có đầy
              đủ.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead>
                  <tr className="border-border text-slate-gray border-b text-xs">
                    <th className="py-2">Kỳ</th>
                    <th>Cơ sở</th>
                    <th>Chuyên khoa</th>
                    <th>Đối tượng</th>
                    <th>Thanh toán</th>
                    <th className="text-right">Số lịch</th>
                    <th className="text-right">Hủy</th>
                    <th className="text-right">Đã khám</th>
                    <th className="text-right">Lỗi HIS</th>
                  </tr>
                </thead>
                <tbody>
                  {report.bookings.slice(0, 50).map((row) => (
                    <tr
                      key={`${row.period}-${row.facilityId}-${row.specialtyName}-${row.objectType}-${row.payMethod}`}
                      className="border-border border-b last:border-0"
                    >
                      <td className="py-2">{formatDate(`${row.period}T00:00:00+07:00`)}</td>
                      <td>{row.facilityName}</td>
                      <td>{row.specialtyName}</td>
                      <td>{row.objectType === 'BHYT' ? 'BHYT' : 'Dịch vụ'}</td>
                      <td>{row.payMethod === 'ONLINE' ? 'Online' : 'Tại viện'}</td>
                      <td className="text-right">{row.bookings}</td>
                      <td className="text-right">{row.cancelled}</td>
                      <td className="text-right">{row.attended}</td>
                      <td className="text-right">{row.hisErrors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.bookings.length === 0 && (
                <p className="text-slate-gray py-6 text-center text-sm">
                  Không có dữ liệu trong khoảng đã chọn.
                </p>
              )}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-3 text-lg font-semibold">Doanh thu theo ngày và cơ sở</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-border text-slate-gray border-b text-xs">
                    <th className="py-2">Ngày</th>
                    <th>Cơ sở</th>
                    <th className="text-right">Thu online</th>
                    <th className="text-right">Đã hoàn</th>
                  </tr>
                </thead>
                <tbody>
                  {report.revenue.slice(0, 50).map((row) => (
                    <tr key={`${row.day}-${row.facilityId}`} className="border-border border-b last:border-0">
                      <td className="py-2">{formatDate(`${row.day}T00:00:00+07:00`)}</td>
                      <td>{row.facilityName}</td>
                      <td className="text-right">{formatMoney(row.onlineVnd)}</td>
                      <td className="text-right">{formatMoney(row.refundedVnd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.revenue.length === 0 && (
                <p className="text-slate-gray py-6 text-center text-sm">
                  Chưa có thanh toán trong khoảng đã chọn.
                </p>
              )}
            </div>
          </Card>
        </>
      )}
      {health && (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Activity size={18} />
            <h2 className="text-lg font-semibold">Giám sát kết nối cơ sở</h2>
          </div>
          <p className="text-slate-gray mb-3 text-xs">
            Trạng thái HIS, lỗi và độ trễ trong 1 giờ gần nhất; số lệnh đang chờ gửi lại.
          </p>
          <HealthList rows={health} />
        </Card>
      )}
    </div>
  );
}
