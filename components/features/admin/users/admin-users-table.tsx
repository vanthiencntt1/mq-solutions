import { CheckCircle2, Lock, RotateCcw, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { AdminUserRow } from '@/lib/domain/admin/ports';

export function AdminUsersTable({
  rows,
  total,
  pending,
  manager,
  onEdit,
  onToggle,
  onReset,
}: {
  rows: AdminUserRow[];
  total: number;
  pending: boolean;
  manager: boolean;
  onEdit(row: AdminUserRow): void;
  onToggle(row: AdminUserRow): void;
  onReset(row: AdminUserRow): void;
}) {
  return (
    <Card className="overflow-x-auto p-0">
      <div className="border-border flex items-center justify-between border-b px-5 py-4">
        <h2 className="text-ink-navy font-semibold">Danh sách nhân viên</h2>
        <span className="text-slate-gray text-sm">{total} người dùng</span>
      </div>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="bg-muted text-slate-gray">
          <tr>
            <th className="px-5 py-3">Nhân viên</th>
            <th className="px-5 py-3">Vai trò</th>
            <th className="px-5 py-3">Cơ sở</th>
            <th className="px-5 py-3">Trạng thái</th>
            <th className="px-5 py-3">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-border border-t">
              <td className="px-5 py-3">
                <strong className="text-ink-navy block">{row.name}</strong>
                <span className="text-slate-gray">{row.email}</span>
              </td>
              <td className="px-5 py-3">{row.role}</td>
              <td className="px-5 py-3">{row.facilityName ?? 'Toàn hệ thống'}</td>
              <td className="px-5 py-3">
                {row.active ? (
                  <span className="text-success inline-flex items-center gap-1">
                    <CheckCircle2 size={15} /> Hoạt động
                  </span>
                ) : (
                  <span className="text-danger inline-flex items-center gap-1">
                    <Lock size={15} /> Đã khóa
                  </span>
                )}
              </td>
              <td className="px-5 py-3">
                <div className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" disabled={pending || manager} onClick={() => onEdit(row)}>
                    Sửa
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => onToggle(row)}>
                    {row.active ? <Lock size={15} /> : <Unlock size={15} />}
                    {row.active ? 'Khóa' : 'Mở'}
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => onReset(row)}>
                    <RotateCcw size={15} /> 2FA
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="text-slate-gray px-5 py-8 text-center">Chưa có người dùng trong phạm vi này.</p>
      ) : null}
    </Card>
  );
}
