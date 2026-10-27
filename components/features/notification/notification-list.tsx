'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell, BellOff, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Alert } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatDateTime } from '@/lib/utils/format';
import type { NotificationRow } from '@/lib/domain/ports';

interface Props {
  rows: NotificationRow[];
  unread: number;
  total: number;
  page: number;
  pageSize: number;
}

export function NotificationList({ rows: initialRows, unread: initialUnread, total, page, pageSize }: Props) {
  const [rows, setRows] = useState(initialRows);
  const [unread, setUnread] = useState(initialUnread);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function markRead(id: string) {
    setPending(id);
    setError('');
    try {
      await apiFetch(`/api/me/notifications/${id}/read`, { method: 'POST' });
      setRows((current) => current.map((row) => (row.id === id ? { ...row, readAt: new Date() } : row)));
      setUnread((current) => Math.max(0, current - 1));
      window.dispatchEvent(new Event('notifications:changed'));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa đánh dấu được thông báo');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-primary text-sm font-semibold">W08 · TÀI KHOẢN</p>
          <h1 className="text-[28px] font-bold">Thông báo</h1>
          <p className="text-slate-gray text-sm">Lịch khám và cập nhật dành cho bạn.</p>
        </div>
        <span className="bg-info-bg text-info inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold">
          <Bell size={16} aria-hidden />
          {unread} chưa đọc
        </span>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {rows.length === 0 ? (
        <Card className="py-12 text-center">
          <BellOff className="text-slate-gray mx-auto mb-3" size={28} aria-hidden />
          <p className="font-semibold">Chưa có thông báo</p>
          <p className="text-slate-gray text-sm">Các cập nhật về phiếu khám sẽ xuất hiện tại đây.</p>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id}>
              <Card className={`space-y-3 ${row.readAt ? '' : 'border-primary/40'}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-1 size-2 rounded-full ${row.readAt ? 'bg-mist-gray' : 'bg-primary'}`}
                      aria-hidden
                    />
                    <div>
                      <h2 className="font-semibold">{row.title}</h2>
                      <p className="text-slate-gray text-xs">{formatDateTime(row.createdAt)}</p>
                    </div>
                  </div>
                  <span className="text-slate-gray text-xs">{row.readAt ? 'Đã đọc' : 'Chưa đọc'}</span>
                </div>
                <p className="pl-5 text-sm whitespace-pre-line">{row.body}</p>
                <div className="flex flex-wrap gap-3 pl-5">
                  {row.link ? (
                    <Link
                      href={row.link}
                      className="text-primary text-sm font-semibold underline-offset-2 hover:underline"
                    >
                      Xem chi tiết
                    </Link>
                  ) : null}
                  {!row.readAt ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={pending === row.id}
                      onClick={() => void markRead(row.id)}
                    >
                      <Check size={16} aria-hidden />
                      {pending === row.id ? 'Đang lưu…' : 'Đánh dấu đã đọc'}
                    </Button>
                  ) : null}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <nav aria-label="Phân trang thông báo" className="flex items-center justify-between gap-4 text-sm">
        <span className="text-slate-gray">
          Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-2">
          {page > 1 ? (
            <Link className="text-primary inline-flex items-center gap-1" href={`?page=${page - 1}`}>
              <ChevronLeft size={16} />
              Trước
            </Link>
          ) : null}
          {page * pageSize < total ? (
            <Link className="text-primary inline-flex items-center gap-1" href={`?page=${page + 1}`}>
              Tiếp
              <ChevronRight size={16} />
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}
