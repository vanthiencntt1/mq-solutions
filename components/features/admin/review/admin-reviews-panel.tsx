'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, EyeOff, Star } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { formatDateTime } from '@/lib/utils/format';

interface Row {
  id: string;
  facilityName: string;
  rating: number;
  comment: string | null;
  status: string;
  reply: string | null;
  createdAt: string;
}

const selectStyle = 'border-border bg-card text-ink-navy h-11 w-full rounded-md border px-3 text-sm';

export function AdminReviewsPanel({
  rows,
  total,
  page,
  pageSize,
  facilities,
  facilityId,
  status,
  rating,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  facilities: { id: string; name: string }[];
  facilityId: string;
  status: string;
  rating: string;
}) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pendingId, setPendingId] = useState('');

  async function save(id: string, body: { status?: string; reply?: string | null }) {
    setPendingId(id);
    setError('');
    setNotice('');
    try {
      await apiFetch(`/api/admin/reviews/${id}`, { method: 'PATCH', body });
      setNotice('Đã cập nhật đánh giá.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa cập nhật được đánh giá.');
    } finally {
      setPendingId('');
    }
  }

  const filters = new URLSearchParams();
  if (facilityId) filters.set('facilityId', facilityId);
  if (status) filters.set('status', status);
  if (rating) filters.set('rating', rating);
  const pageUrl = (n: number) =>
    `/admin/danh-gia?${new URLSearchParams({ ...Object.fromEntries(filters), page: String(n) })}`;

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Card className="p-4">
        <form method="GET" className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <FormField id="review-facility" label="Cơ sở">
            <select id="review-facility" name="facilityId" defaultValue={facilityId} className={selectStyle}>
              <option value="">Tất cả cơ sở</option>
              {facilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="review-status" label="Trạng thái">
            <select id="review-status" name="status" defaultValue={status} className={selectStyle}>
              <option value="">Tất cả</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="SHOWN">Hiển thị</option>
              <option value="HIDDEN">Đã ẩn</option>
            </select>
          </FormField>
          <FormField id="review-stars" label="Số sao">
            <select id="review-stars" name="rating" defaultValue={rating} className={selectStyle}>
              <option value="">Tất cả</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} sao
                </option>
              ))}
            </select>
          </FormField>
          <Button type="submit" variant="outline">
            Lọc đánh giá
          </Button>
        </form>
      </Card>
      <p className="text-slate-gray text-sm">{total} đánh giá trong phạm vi của bạn</p>
      {rows.length ? (
        rows.map((row) => <ReviewCard key={row.id} row={row} pending={pendingId === row.id} onSave={save} />)
      ) : (
        <Card>
          <p className="text-slate-gray">Chưa có đánh giá phù hợp bộ lọc.</p>
        </Card>
      )}
      <nav aria-label="Phân trang đánh giá" className="flex items-center justify-between text-sm">
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

function ReviewCard({
  row,
  pending,
  onSave,
}: {
  row: Row;
  pending: boolean;
  onSave(id: string, input: { status?: string; reply?: string | null }): Promise<void>;
}) {
  const [reply, setReply] = useState(row.reply ?? '');
  const status = row.status === 'PENDING' ? 'Chờ duyệt' : row.status === 'SHOWN' ? 'Hiển thị' : 'Đã ẩn';
  const tone = row.status === 'PENDING' ? 'warning' : row.status === 'SHOWN' ? 'success' : 'neutral';
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void onSave(row.id, { reply: reply.trim() || null });
  }
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-ink-navy font-semibold">{row.facilityName}</p>
          <p className="text-slate-gray text-xs">{formatDateTime(row.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-warning inline-flex items-center gap-1 text-sm">
            <Star size={16} /> {row.rating}/5
          </span>
          <Badge tone={tone}>{status}</Badge>
        </div>
      </div>
      <p className="text-ink-navy whitespace-pre-wrap">{row.comment || 'Không có nhận xét bằng chữ.'}</p>
      <div className="flex flex-wrap gap-2">
        {row.status !== 'SHOWN' ? (
          <Button size="sm" disabled={pending} onClick={() => void onSave(row.id, { status: 'SHOWN' })}>
            <CheckCircle2 size={16} /> Duyệt hiển thị
          </Button>
        ) : null}
        {row.status !== 'HIDDEN' ? (
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => void onSave(row.id, { status: 'HIDDEN' })}
          >
            <EyeOff size={16} /> Ẩn
          </Button>
        ) : null}
      </div>
      <form onSubmit={submit} className="space-y-2">
        <FormField id={`reply-${row.id}`} label="Trả lời công khai">
          <textarea
            id={`reply-${row.id}`}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            maxLength={2000}
            rows={3}
            className="border-border bg-card w-full rounded-md border p-3 text-sm"
          />
        </FormField>
        <Button size="sm" variant="outline" type="submit" disabled={pending || reply === (row.reply ?? '')}>
          Lưu trả lời
        </Button>
      </form>
    </Card>
  );
}
