import type { Metadata } from 'next';
import { formatInTimeZone } from 'date-fns-tz';
import Link from 'next/link';
import { Activity, CalendarDays, CircleAlert, Clock3, CreditCard, ListTodo, Wallet } from 'lucide-react';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { HealthList } from '@/components/features/admin/report/health-list';
import { ReportTrend } from '@/components/features/admin/report/report-trend';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { getReportService } from '@/lib/services/report';
import { ReportQuerySchema } from '@/lib/services/report/types';
import { formatDate, formatMoney } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Tổng quan' };

export default async function Page() {
  const actor = await requireAdminPage(PERMISSIONS.DASHBOARD_READ);
  const service = getReportService();
  const now = new Date();
  const today = formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const from = formatInTimeZone(new Date(now.getTime() - 29 * 86_400_000), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  const mayReport = can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.REPORT_READ);
  const [dashboard, trend] = await Promise.all([
    service.dashboard(actor),
    mayReport ? service.report(actor, ReportQuerySchema.parse({ from, to: today })) : Promise.resolve(null),
  ]);
  const issues = dashboard.health.filter((item) => item.health === 'DOWN' || item.health === 'DEGRADED');
  const tasks = [
    { label: 'Phiếu lỗi HIS quá 30 phút', value: dashboard.tasks.staleHis, href: '/admin/lich-dat' },
    { label: 'Yêu cầu hủy', value: dashboard.tasks.cancelRequests, href: '/admin/lich-dat' },
    { label: 'Chờ hoàn tiền', value: dashboard.tasks.refundPending, href: '/admin/thanh-toan' },
    {
      label: 'Giao dịch lệch / chưa khớp',
      value: dashboard.tasks.paymentMismatch,
      href: '/admin/thanh-toan',
    },
    {
      label: 'Lệch thông tin hành chính HIS',
      value: dashboard.tasks.patientInfoMismatch,
      href: '/admin/lich-dat',
    },
    { label: 'Đối soát lệch (7 ngày)', value: dashboard.tasks.reconcileMismatch, href: '/admin/thanh-toan' },
    { label: 'Lệnh HIS còn trong outbox', value: dashboard.tasks.outboxPending, href: '/admin/lich-dat' },
  ];
  const cards = [
    { label: 'Lịch đặt mới', value: dashboard.newBookings.toLocaleString('vi-VN'), Icon: CalendarDays },
    { label: 'Lịch khám hôm nay', value: dashboard.examsToday.toLocaleString('vi-VN'), Icon: Clock3 },
    {
      label: 'Đã thanh toán online',
      value: dashboard.onlineBookings.toLocaleString('vi-VN'),
      Icon: CreditCard,
    },
    {
      label: 'Thanh toán tại viện',
      value: dashboard.atFacilityBookings.toLocaleString('vi-VN'),
      Icon: CreditCard,
    },
    { label: 'Doanh thu online', value: formatMoney(dashboard.onlineVnd), Icon: Wallet },
    { label: 'Phiếu lỗi HIS', value: dashboard.hisErrors.toLocaleString('vi-VN'), Icon: CircleAlert },
  ];

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-xs font-semibold">A10 · VẬN HÀNH</p>
          <h1 className="text-[28px] font-bold">Tổng quan</h1>
          <p className="text-slate-gray text-sm">
            Tình hình ngày {formatDate(`${today}T00:00:00+07:00`)} · giờ Việt Nam
          </p>
        </div>
        {mayReport && (
          <Link
            href="/admin/bao-cao"
            className="text-primary text-sm font-semibold underline-offset-4 hover:underline"
          >
            Xem báo cáo →
          </Link>
        )}
      </header>
      <section aria-label="Chỉ số hôm nay" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, Icon }) => (
          <Card key={label} className="p-4">
            <div className="text-slate-gray flex items-center gap-2 text-xs font-semibold">
              <Icon size={16} />
              {label}
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
          </Card>
        ))}
      </section>
      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Kết nối cơ sở</h2>
            <Badge tone={issues.length ? 'danger' : 'success'}>
              <Activity size={13} />
              {issues.length ? `${issues.length} cần kiểm tra` : 'Ổn định'}
            </Badge>
          </div>
          <HealthList rows={dashboard.health} />
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <ListTodo size={18} />
            <h2 className="text-lg font-semibold">Việc cần xử lý</h2>
          </div>
          <ul className="divide-border divide-y">
            {tasks.map((task) => (
              <li key={task.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={task.href} className="hover:text-primary hover:underline">
                  {task.label}
                </Link>
                <Badge tone={task.value ? 'warning' : 'neutral'}>{task.value}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {trend && (
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Xu hướng 30 ngày</h2>
              <p className="text-slate-gray text-xs">Lượt đặt mới theo cơ sở, tính theo ngày tạo phiếu</p>
            </div>
            <span className="text-slate-gray text-xs">
              {Math.round(dashboard.hisErrorRate * 100)}% phiếu lỗi HIS hôm nay
            </span>
          </div>
          <ReportTrend rows={trend.bookings} />
        </Card>
      )}
    </div>
  );
}
