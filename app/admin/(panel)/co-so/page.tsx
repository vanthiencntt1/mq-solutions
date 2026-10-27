import type { Metadata } from 'next';
import Link from 'next/link';
import { Activity, CircleCheck, CirclePause, EyeOff, Plus } from 'lucide-react';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { FacilityListSchema } from '@/lib/domain/admin/facility-schemas';
import { getAdminFacilityService } from '@/lib/services/admin-facility';
import { formatDateTime } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Cơ sở y tế' };

const statusText = { ACTIVE: 'Hoạt động', PAUSED: 'Tạm ngưng', INACTIVE: 'Ẩn' } as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const admin = await requireAdminPage(PERMISSIONS.FACILITY_READ);
  const query = FacilityListSchema.parse(await searchParams);
  const { rows, total } = await getAdminFacilityService().list(admin, query);
  const editable = can({ name: admin.role, permissions: admin.permissions }, PERMISSIONS.FACILITY_UPDATE);
  const urlFor = (page: number) =>
    `/admin/co-so?${new URLSearchParams({ q: query.q, status: query.status ?? '', province: query.province ?? '', page: String(page) })}`;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary flex items-center gap-2 text-sm font-semibold">
            <Activity size={18} /> A02 · CƠ SỞ Y TẾ
          </p>
          <h1 className="text-ink-navy mt-1 text-[28px] font-bold">Quản lý cơ sở</h1>
          <p className="text-slate-gray mt-1 text-sm">
            Theo dõi kết nối HIS và cấu hình đặt khám của từng cơ sở.
          </p>
        </div>
        {editable && admin.facilityIds === null ? (
          <Button asChild>
            <Link href="/admin/co-so/them-moi">
              <Plus size={18} /> Thêm cơ sở
            </Link>
          </Button>
        ) : null}
      </div>
      <Card>
        <form className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_1fr_1fr_auto]" action="/admin/co-so">
          <input
            name="q"
            defaultValue={query.q}
            placeholder="Tìm mã, tên hoặc địa chỉ"
            aria-label="Tìm cơ sở"
            className="border-input bg-card h-11 rounded-md border px-3"
          />
          <select
            name="status"
            defaultValue={query.status ?? ''}
            aria-label="Trạng thái"
            className="border-input bg-card h-11 rounded-md border px-3"
          >
            <option value="">Mọi trạng thái</option>
            <option value="ACTIVE">Hoạt động</option>
            <option value="PAUSED">Tạm ngưng</option>
            <option value="INACTIVE">Ẩn</option>
          </select>
          <input
            name="province"
            defaultValue={query.province ?? ''}
            placeholder="Tỉnh / thành"
            aria-label="Tỉnh hoặc thành phố"
            className="border-input bg-card h-11 rounded-md border px-3"
          />
          <Button type="submit" variant="dark">
            Lọc
          </Button>
        </form>
      </Card>
      <Card className="overflow-x-auto p-0">
        <div className="border-border flex justify-between border-b px-5 py-4">
          <h2 className="text-ink-navy font-semibold">Danh sách cơ sở</h2>
          <span className="text-slate-gray">{total} cơ sở</span>
        </div>
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-muted text-slate-gray">
            <tr>
              <th className="px-5 py-3">Cơ sở</th>
              <th className="px-5 py-3">Loại · tỉnh</th>
              <th className="px-5 py-3">Trạng thái</th>
              <th className="px-5 py-3">Kết nối</th>
              <th className="px-5 py-3">Lịch hôm nay</th>
              <th className="px-5 py-3">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-border border-t align-top">
                <td className="px-5 py-4">
                  <strong className="text-ink-navy block">{row.name}</strong>
                  <span className="text-slate-gray">{row.code}</span>
                </td>
                <td className="px-5 py-4">
                  {row.type.replaceAll('_', ' ')}
                  <br />
                  <span className="text-slate-gray">{row.provinceName}</span>
                </td>
                <td className="px-5 py-4">
                  <Badge
                    tone={
                      row.status === 'ACTIVE' ? 'success' : row.status === 'PAUSED' ? 'warning' : 'neutral'
                    }
                  >
                    {row.status === 'ACTIVE' ? (
                      <CircleCheck size={14} />
                    ) : row.status === 'PAUSED' ? (
                      <CirclePause size={14} />
                    ) : (
                      <EyeOff size={14} />
                    )}{' '}
                    {statusText[row.status]}
                  </Badge>
                </td>
                <td className="px-5 py-4">
                  <Badge
                    tone={
                      row.health === 'OK'
                        ? 'success'
                        : row.health === 'DEGRADED'
                          ? 'warning'
                          : row.health === 'DOWN'
                            ? 'danger'
                            : 'neutral'
                    }
                  >
                    <Activity size={14} /> {row.health}
                  </Badge>
                  <span className="text-slate-gray mt-1 block text-xs">
                    OK cuối: {row.lastOkAt ? formatDateTime(row.lastOkAt) : 'Chưa có'}
                  </span>
                </td>
                <td className="px-5 py-4 font-semibold">{row.appointmentsToday}</td>
                <td className="px-5 py-4">
                  <Link
                    className="text-primary font-semibold hover:underline"
                    href={`/admin/co-so/${row.id}`}
                  >
                    Xem cơ sở →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="text-slate-gray px-5 py-8 text-center">Không tìm thấy cơ sở trong phạm vi của bạn.</p>
        ) : null}
      </Card>
      <nav
        aria-label="Phân trang cơ sở"
        className="text-primary flex justify-end gap-5 text-sm font-semibold"
      >
        {query.page > 1 ? <Link href={urlFor(query.page - 1)}>← Trước</Link> : null}
        <span className="text-slate-gray">
          Trang {query.page} / {Math.max(1, Math.ceil(total / query.pageSize))}
        </span>
        {query.page * query.pageSize < total ? <Link href={urlFor(query.page + 1)}>Tiếp →</Link> : null}
      </nav>
    </div>
  );
}
