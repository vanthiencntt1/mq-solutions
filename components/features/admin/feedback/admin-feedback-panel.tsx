'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleHelp, Clock3, Inbox } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import {
  FEEDBACK_STATUS,
  FEEDBACK_TOPICS,
  type FeedbackStatus,
  type FeedbackTopic,
} from '@/lib/domain/feedback/types';
import { formatDateTime } from '@/lib/utils/format';

interface Row {
  id: string;
  topic: FeedbackTopic;
  message: string;
  appointmentId: string | null;
  appointmentCode: string | null;
  facilityId: string | null;
  facilityName: string | null;
  status: FeedbackStatus;
  assignee: string | null;
  createdAt: string;
}

interface Props {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  status: string;
  facilityId: string;
  facilities: { id: string; name: string }[];
  assignees: { id: string; name: string; facilityId: string | null }[];
}

const fieldStyle = 'border-border bg-card text-ink-navy h-11 w-full rounded-md border px-3 text-sm';

export function AdminFeedbackPanel({
  rows,
  total,
  page,
  pageSize,
  status,
  facilityId,
  facilities,
  assignees,
}: Props) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function update(id: string, body: { status?: FeedbackStatus; assignee?: string | null }) {
    setPendingId(id);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/admin/feedback/${id}`, { method: 'PATCH', body });
      setNotice(body.status === 'DONE' ? 'Đã hoàn tất và gửi email thông báo.' : 'Đã cập nhật góp ý.');
      router.refresh();
    } catch (cause) {
      setError(
        body.status === 'DONE'
          ? 'Chưa xác nhận được email. Trạng thái sẽ được tải lại; nếu đã xong, hãy dùng “Gửi lại email”.'
          : cause instanceof ApiError
            ? cause.message
            : 'Chưa cập nhật được góp ý.',
      );
      router.refresh();
    } finally {
      setPendingId('');
    }
  }

  async function notify(id: string) {
    setPendingId(id);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/admin/feedback/${id}/notify`, { method: 'POST' });
      setNotice('Đã gửi lại email thông báo.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa gửi lại được email.');
    } finally {
      setPendingId('');
    }
  }

  const pageUrl = (next: number) =>
    `/admin/danh-gia/gop-y?${new URLSearchParams({
      ...(status ? { status } : {}),
      ...(facilityId ? { facilityId } : {}),
      page: String(next),
    })}`;

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Card className="p-4">
        <form method="GET" className="flex flex-wrap items-end gap-3">
          <FormField id="feedback-status-filter" label="Trạng thái">
            <select id="feedback-status-filter" name="status" defaultValue={status} className={fieldStyle}>
              <option value="">Tất cả</option>
              {Object.entries(FEEDBACK_STATUS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="feedback-facility-filter" label="Cơ sở">
            <select
              id="feedback-facility-filter"
              name="facilityId"
              defaultValue={facilityId}
              className={fieldStyle}
            >
              <option value="">Tất cả cơ sở được phép</option>
              {facilities.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.name}
                </option>
              ))}
            </select>
          </FormField>
          <Button type="submit" variant="outline">
            Lọc góp ý
          </Button>
        </form>
      </Card>
      <p className="text-slate-gray text-sm">{total} góp ý phù hợp</p>
      {rows.length ? (
        rows.map((row) => (
          <FeedbackAdminCard
            key={row.id}
            row={row}
            assignees={assignees}
            pending={pendingId === row.id}
            onUpdate={update}
            onNotify={notify}
          />
        ))
      ) : (
        <Card className="py-10 text-center">
          <Inbox className="text-slate-gray mx-auto mb-3 size-7" aria-hidden />
          <p className="font-semibold">Chưa có góp ý phù hợp</p>
          <p className="text-slate-gray text-sm">Thử đổi bộ lọc hoặc quay lại sau.</p>
        </Card>
      )}
      <nav aria-label="Phân trang góp ý" className="flex items-center justify-between text-sm">
        <span className="text-slate-gray">
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

function FeedbackAdminCard({
  row,
  assignees,
  pending,
  onUpdate,
  onNotify,
}: {
  row: Row;
  assignees: { id: string; name: string; facilityId: string | null }[];
  pending: boolean;
  onUpdate(id: string, body: { status?: FeedbackStatus; assignee?: string | null }): Promise<void>;
  onNotify(id: string): Promise<void>;
}) {
  const Icon = row.status === 'DONE' ? CheckCircle2 : row.status === 'IN_PROGRESS' ? Clock3 : CircleHelp;
  const tone = row.status === 'DONE' ? 'success' : row.status === 'IN_PROGRESS' ? 'warning' : 'info';
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-ink-navy font-semibold">{FEEDBACK_TOPICS[row.topic]}</h2>
          <p className="text-slate-gray text-xs">
            {formatDateTime(row.createdAt)} · {row.facilityName ?? 'Không gắn cơ sở'}
            {row.appointmentCode ? ` · Phiếu ${row.appointmentCode}` : ''}
          </p>
        </div>
        <Badge tone={tone}>
          <Icon size={14} aria-hidden /> {FEEDBACK_STATUS[row.status]}
        </Badge>
      </div>
      <p className="text-ink-navy text-sm whitespace-pre-wrap">{row.message}</p>
      <div className="border-border flex flex-wrap items-end gap-3 border-t pt-4">
        <FormField id={`assignee-${row.id}`} label="Người xử lý" className="min-w-52 flex-1">
          <select
            id={`assignee-${row.id}`}
            value={row.assignee ?? ''}
            disabled={pending}
            className={fieldStyle}
            onChange={(event) => void onUpdate(row.id, { assignee: event.target.value || null })}
          >
            <option value="">Chưa phân công</option>
            {assignees
              .filter((person) => person.facilityId === null || person.facilityId === row.facilityId)
              .map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
          </select>
        </FormField>
        {row.status !== 'NEW' ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={pending}
            onClick={() => void onUpdate(row.id, { status: 'NEW' })}
          >
            Đánh dấu mới
          </Button>
        ) : null}
        {row.status !== 'IN_PROGRESS' ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={pending}
            onClick={() => void onUpdate(row.id, { status: 'IN_PROGRESS' })}
          >
            Đang xử lý
          </Button>
        ) : null}
        {row.status !== 'DONE' ? (
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={pending}
            onClick={() => void onUpdate(row.id, { status: 'DONE' })}
          >
            <CheckCircle2 size={16} aria-hidden /> Hoàn tất & gửi email
          </Button>
        ) : null}
        {row.status === 'DONE' ? (
          <Button
            type="button"
            variant="outline"
            size="md"
            disabled={pending}
            onClick={() => void onNotify(row.id)}
          >
            Gửi lại email
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
