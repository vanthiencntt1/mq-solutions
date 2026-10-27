'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock3, Inbox } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { formatDateTime } from '@/lib/utils/format';

interface Row {
  id: string;
  type: string;
  org: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  status: string;
  assignee: string | null;
  note: string | null;
  createdAt: string;
}

const labels: Record<string, string> = {
  CO_SO: 'Cơ sở y tế',
  PHONG_MACH: 'Phòng mạch',
  QUANG_CAO: 'Quảng cáo',
  KHAC: 'Khác',
};
const selectStyle = 'border-border bg-card text-ink-navy h-11 w-full rounded-md border px-3 text-sm';

export function AdminContactsPanel({
  rows,
  total,
  page,
  pageSize,
  status,
  assignees,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
  assignees: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState('');

  async function save(id: string, body: { status?: string; note?: string | null; assignee?: string | null }) {
    setPendingId(id);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/admin/contacts/${id}`, { method: 'PATCH', body });
      setNotice('Đã cập nhật liên hệ.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa cập nhật được liên hệ.');
    } finally {
      setPendingId('');
    }
  }

  const pageUrl = (n: number) =>
    `/admin/danh-gia?${new URLSearchParams({ view: 'contacts', ...(status ? { status } : {}), page: String(n) })}`;
  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Card className="p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="view" value="contacts" />
          <FormField id="contact-status" label="Trạng thái">
            <select id="contact-status" name="status" defaultValue={status} className={selectStyle}>
              <option value="">Tất cả</option>
              <option value="NEW">Mới</option>
              <option value="IN_PROGRESS">Đang xử lý</option>
              <option value="DONE">Đã xong</option>
            </select>
          </FormField>
          <Button type="submit" variant="outline">
            Lọc liên hệ
          </Button>
        </form>
      </Card>
      <p className="text-slate-gray text-sm">{total} liên hệ hợp tác</p>
      {rows.length ? (
        rows.map((row) => (
          <ContactCard
            key={row.id}
            row={row}
            assignees={assignees}
            pending={pendingId === row.id}
            onSave={save}
          />
        ))
      ) : (
        <Card>
          <p className="text-slate-gray flex items-center gap-2">
            <Inbox size={18} /> Chưa có liên hệ phù hợp bộ lọc.
          </p>
        </Card>
      )}
      <nav aria-label="Phân trang liên hệ" className="flex items-center justify-between text-sm">
        <span>
          Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-4">
          {page > 1 ? (
            <Link className="text-primary font-semibold" href={pageUrl(page - 1)}>
              ← Trước
            </Link>
          ) : null}
          {page * pageSize < total ? (
            <Link className="text-primary font-semibold" href={pageUrl(page + 1)}>
              Tiếp →
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function ContactCard({
  row,
  assignees,
  pending,
  onSave,
}: {
  row: Row;
  assignees: { id: string; name: string }[];
  pending: boolean;
  onSave(
    id: string,
    input: { status?: string; note?: string | null; assignee?: string | null },
  ): Promise<void>;
}) {
  const [note, setNote] = useState(row.note ?? '');
  const [assignee, setAssignee] = useState(row.assignee ?? '');
  const status = row.status === 'NEW' ? 'Mới' : row.status === 'IN_PROGRESS' ? 'Đang xử lý' : 'Đã xong';
  const tone = row.status === 'NEW' ? 'info' : row.status === 'IN_PROGRESS' ? 'warning' : 'success';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave(row.id, { note: note.trim() || null });
  }
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-ink-navy font-semibold">{row.org}</h2>
          <p className="text-slate-gray text-xs">
            {labels[row.type] ?? row.type} · {formatDateTime(row.createdAt)}
          </p>
        </div>
        <Badge tone={tone}>{status}</Badge>
      </div>
      <div className="text-slate-gray grid gap-1 text-sm sm:grid-cols-2">
        <p>
          Người liên hệ: <strong className="text-ink-navy">{row.name}</strong>
        </p>
        <p>Điện thoại: {row.phone}</p>
        <p>Email: {row.email}</p>
      </div>
      <p className="text-ink-navy whitespace-pre-wrap">{row.message}</p>
      <div className="flex flex-wrap gap-2">
        {row.status !== 'IN_PROGRESS' ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void onSave(row.id, { status: 'IN_PROGRESS' })}
          >
            <Clock3 size={16} /> Đang xử lý
          </Button>
        ) : null}
        {row.status !== 'DONE' ? (
          <Button size="sm" disabled={pending} onClick={() => void onSave(row.id, { status: 'DONE' })}>
            <CheckCircle2 size={16} /> Đánh dấu đã xong
          </Button>
        ) : null}
      </div>
      <form onSubmit={submit} className="space-y-2">
        <FormField id={`contact-note-${row.id}`} label="Ghi chú nội bộ">
          <textarea
            id={`contact-note-${row.id}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={2000}
            rows={3}
            className="border-border bg-card w-full rounded-md border p-3 text-sm"
          />
        </FormField>
        <Button size="sm" variant="outline" type="submit" disabled={pending || note === (row.note ?? '')}>
          Lưu ghi chú
        </Button>
      </form>
      <FormField id={`contact-assignee-${row.id}`} label="Người phụ trách">
        <select
          id={`contact-assignee-${row.id}`}
          value={assignee}
          onChange={(event) => {
            const value = event.target.value;
            setAssignee(value);
            void onSave(row.id, { assignee: value || null });
          }}
          disabled={pending}
          className={selectStyle}
        >
          <option value="">Chưa phân công</option>
          {assignees.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </FormField>
    </Card>
  );
}
