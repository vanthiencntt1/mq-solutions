'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Plus, ShieldCheck } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Alert, FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { AdminUserRow } from '@/lib/domain/admin/ports';
import { AdminRoleForm } from './admin-role-form';
import { AdminUsersTable } from './admin-users-table';

interface Props {
  rows: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
  roles: string[];
  facilities: { id: string; name: string }[];
  manager: boolean;
}

const selectStyle = 'border-input bg-card text-foreground h-11 w-full rounded-md border px-3 text-sm';

export function AdminUsersPanel({ rows, total, page, pageSize, roles, facilities, manager }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState(roles[0] ?? 'FACILITY_STAFF');
  const [facilityId, setFacilityId] = useState(manager ? (facilities[0]?.id ?? '') : '');
  const [editing, setEditing] = useState<AdminUserRow | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editFacility, setEditFacility] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pending, setPending] = useState(false);

  async function execute(action: () => Promise<unknown>, success: string): Promise<boolean> {
    setPending(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice(success);
      router.refresh();
      return true;
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không thể thực hiện thao tác');
      return false;
    } finally {
      setPending(false);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const created = await execute(
      () =>
        apiFetch('/api/admin/users', {
          method: 'POST',
          body: {
            email,
            name,
            role,
            facilityId: facilityId || null,
          },
        }),
      'Đã tạo người dùng. Mật khẩu tạm đã được gửi qua email.',
    );
    if (created) {
      setEmail('');
      setName('');
    }
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    const saved = await execute(
      () =>
        apiFetch(`/api/admin/users/${editing.id}`, {
          method: 'PATCH',
          body: {
            role: editRole,
            facilityId: editFacility || null,
          },
        }),
      'Đã cập nhật vai trò và phạm vi cơ sở.',
    );
    if (saved) setEditing(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-primary flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={18} /> A01 · PHÂN QUYỀN
        </p>
        <h1 className="text-ink-navy mt-1 text-[28px] font-bold">Người dùng quản trị</h1>
        <p className="text-slate-gray text-sm">
          Tạo tài khoản, phân quyền theo vai trò và cơ sở, khóa phiên hoặc đặt lại 2FA.
        </p>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? (
        <Alert tone="success">
          <CheckCircle2 size={18} className="mr-2 inline" />
          {notice}
        </Alert>
      ) : null}
      <Card>
        <h2 className="text-ink-navy mb-4 text-lg font-semibold">Thêm người dùng</h2>
        <form onSubmit={create} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FormField id="new-name" label="Họ tên">
            <Input
              id="new-name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>
          <FormField id="new-email" label="Email">
            <Input
              id="new-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <FormField id="new-role" label="Vai trò">
            <select
              id="new-role"
              className={selectStyle}
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                if (!['FACILITY_STAFF', 'FACILITY_MANAGER', 'ACCOUNTANT'].includes(e.target.value))
                  setFacilityId('');
              }}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="new-facility" label="Cơ sở" hint="Nhân viên cơ sở bắt buộc chọn một cơ sở">
            <select
              id="new-facility"
              className={selectStyle}
              value={facilityId}
              onChange={(e) => setFacilityId(e.target.value)}
              disabled={manager}
            >
              <option value="">Toàn hệ thống</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </FormField>
          <div className="sm:col-span-2 xl:col-span-4">
            <Button type="submit" disabled={pending || !roles.length}>
              <Plus size={18} /> Tạo tài khoản
            </Button>
          </div>
        </form>
      </Card>
      {!manager ? (
        <AdminRoleForm
          pending={pending}
          onCreate={(name, permissions) =>
            execute(
              () => apiFetch('/api/admin/users/roles', { method: 'POST', body: { name, permissions } }),
              'Đã tạo vai trò mới.',
            )
          }
        />
      ) : null}
      <AdminUsersTable
        rows={rows}
        total={total}
        pending={pending}
        manager={manager}
        onEdit={(row) => {
          setEditing(row);
          setEditRole(row.role);
          setEditFacility(row.facilityId ?? '');
        }}
        onToggle={(row) => {
          void execute(
            () => apiFetch(`/api/admin/users/${row.id}`, { method: 'PATCH', body: { active: !row.active } }),
            row.active ? 'Đã khóa tài khoản.' : 'Đã mở tài khoản.',
          );
        }}
        onReset={(row) => {
          void execute(
            () => apiFetch(`/api/admin/users/${row.id}/reset-2fa`, { method: 'POST' }),
            'Đã đặt lại 2FA và gửi thông báo.',
          );
        }}
      />
      {editing ? (
        <Card>
          <h2 className="text-ink-navy mb-4 text-lg font-semibold">Sửa {editing.name}</h2>
          <form onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-2">
            <FormField id="edit-role" label="Vai trò">
              <select
                id="edit-role"
                className={selectStyle}
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="edit-facility" label="Cơ sở">
              <select
                id="edit-facility"
                className={selectStyle}
                value={editFacility}
                onChange={(e) => setEditFacility(e.target.value)}
              >
                <option value="">Toàn hệ thống</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </FormField>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={pending}>
                Lưu thay đổi
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Hủy
              </Button>
            </div>
          </form>
        </Card>
      ) : null}
      <nav aria-label="Phân trang người dùng" className="flex justify-between text-sm">
        <span className="text-slate-gray">
          Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-4">
          {page > 1 ? (
            <Link className="text-primary font-semibold" href={`/admin/nguoi-dung?page=${page - 1}`}>
              ← Trước
            </Link>
          ) : null}
          {page * pageSize < total ? (
            <Link className="text-primary font-semibold" href={`/admin/nguoi-dung?page=${page + 1}`}>
              Tiếp →
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
