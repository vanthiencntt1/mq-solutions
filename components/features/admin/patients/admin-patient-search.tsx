'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Search, ShieldCheck, UserRound, CircleAlert } from 'lucide-react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

type Kind = 'cccd' | 'phone' | 'code' | 'name' | 'email';
type Row = {
  id: string;
  nameMasked: string;
  cccdMasked: string;
  phoneMasked: string;
  emailMasked: string;
  status: string;
  createdAt: string;
};
type Result = { rows: Row[]; total: number; page: number; pageSize: number };

const labels: Record<Kind, string> = {
  cccd: 'CCCD',
  phone: 'Số điện thoại',
  code: 'Mã đặt khám',
  name: 'Họ tên',
  email: 'Email',
};
const statuses: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  LOCKED: 'Đã khóa',
  DISPUTED: 'Tranh chấp',
  DELETED: 'Đã xóa',
};

export function AdminPatientSearch({ central }: { central: boolean }) {
  const [kind, setKind] = useState<Kind>('cccd');
  const [q, setQ] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function search(page: number) {
    setPending(true);
    setError('');
    try {
      const found = await apiFetch<Result>('/api/admin/patients', {
        method: 'POST',
        body: { kind, q: q.trim(), page },
      });
      setResult(found);
    } catch (cause) {
      setResult(null);
      setError(cause instanceof ApiError ? cause.message : 'Không thể tra cứu lúc này');
    } finally {
      setPending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void search(1);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="space-y-2">
        <p className="text-primary flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={18} /> A05 · QUẢN LÝ TÀI KHOẢN
        </p>
        <h1 className="text-ink-navy text-[28px] font-bold">Tài khoản bệnh nhân</h1>
        <p className="text-slate-gray text-sm">
          Tra cứu theo thông tin xác định. Kết quả được che dữ liệu cá nhân.
        </p>
      </header>
      <Card>
        <form onSubmit={submit} className="grid items-end gap-4 md:grid-cols-[190px_1fr_auto]">
          <FormField id="patient-kind" label="Tìm theo">
            <select
              id="patient-kind"
              className="border-input bg-card text-foreground h-11 w-full rounded-md border px-3 text-sm"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as Kind);
                setQ('');
                setResult(null);
              }}
            >
              {(Object.keys(labels) as Kind[])
                .filter((item) => central || !['name', 'email'].includes(item))
                .map((item) => (
                  <option key={item} value={item}>
                    {labels[item]}
                  </option>
                ))}
            </select>
          </FormField>
          <FormField
            id="patient-query"
            label="Thông tin tra cứu"
            hint={
              kind === 'cccd'
                ? 'Nhập đủ 12 số CCCD'
                : kind === 'phone'
                  ? 'Nhập đủ 10 số điện thoại'
                  : 'Nhập chính xác email hoặc mã; họ tên từ 3 ký tự'
            }
          >
            <Input
              id="patient-query"
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder={`Nhập ${labels[kind].toLowerCase()}`}
              autoComplete="off"
              required
              maxLength={120}
            />
          </FormField>
          <Button type="submit" disabled={pending}>
            <Search size={17} /> {pending ? 'Đang tìm…' : 'Tìm tài khoản'}
          </Button>
        </form>
      </Card>
      {error ? (
        <Alert tone="danger">
          <CircleAlert size={17} className="mr-2 inline" />
          {error}
        </Alert>
      ) : null}
      {result ? (
        <Card className="overflow-x-auto p-0">
          <div className="border-border flex items-center justify-between border-b px-4 py-4 sm:px-6">
            <h2 className="text-ink-navy flex items-center gap-2 font-semibold">
              <UserRound size={18} /> Kết quả tra cứu
            </h2>
            <span className="text-slate-gray text-sm">{result.total} tài khoản</span>
          </div>
          {result.rows.length ? (
            <table className="w-full min-w-[690px] text-left text-sm">
              <thead className="bg-muted text-slate-gray">
                <tr>
                  <th className="px-5 py-3">Bệnh nhân</th>
                  <th className="px-5 py-3">CCCD</th>
                  <th className="px-5 py-3">Liên hệ</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="border-border border-t">
                    <td className="text-ink-navy px-5 py-3 font-semibold">{row.nameMasked}</td>
                    <td className="px-5 py-3 font-mono">{row.cccdMasked}</td>
                    <td className="px-5 py-3">
                      <span className="block">{row.phoneMasked}</span>
                      <span className="text-slate-gray">{row.emailMasked}</span>
                    </td>
                    <td className="px-5 py-3">{statuses[row.status] ?? row.status}</td>
                    <td className="px-5 py-3">
                      <Link
                        className="text-primary font-semibold underline-offset-4 hover:underline"
                        href={`/admin/benh-nhan/${row.id}`}
                      >
                        Xem →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-slate-gray px-6 py-8 text-center">
              Không tìm thấy tài khoản phù hợp trong phạm vi của bạn.
            </p>
          )}
          {result.total > result.pageSize ? (
            <nav
              aria-label="Phân trang kết quả"
              className="border-border flex items-center justify-between border-t px-5 py-4 text-sm"
            >
              <span>
                Trang {result.page} / {Math.ceil(result.total / result.pageSize)}
              </span>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || result.page === 1}
                  onClick={() => void search(result.page - 1)}
                >
                  Trước
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || result.page * result.pageSize >= result.total}
                  onClick={() => void search(result.page + 1)}
                >
                  Tiếp
                </Button>
              </div>
            </nav>
          ) : null}
        </Card>
      ) : null}
    </div>
  );
}
