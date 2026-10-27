'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, RotateCw } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils/format';

interface Issue {
  kind: string;
  appointmentCode?: string;
  hisKey?: string;
  webValue?: string | number;
  hisValue?: string | number;
}
interface Row {
  id: string;
  facilityName: string;
  examDate: string;
  matched: number;
  missingInHis: number;
  missingInWeb: number;
  statusChanged: number;
  amountDiff: number;
  issues: Issue[];
  bank: { incoming: number; booked: number; difference: number };
  startedAt: string;
  finishedAt: string | null;
}
const issueLabels: Record<string, string> = {
  MISSING_IN_HIS: 'Có trên web, thiếu tại HIS',
  MISSING_IN_WEB: 'Có tại HIS, thiếu trên web',
  STT_MISMATCH: 'Lệch số thứ tự',
  AMOUNT_MISMATCH: 'Lệch tiền với HIS',
  HIS_STATUS_CHANGED: 'HIS đã hoàn hoặc hủy',
  PAYMENT_MISMATCH: 'Tiền nhận lệch giá phiếu',
};

export function ReconcilePanel({
  rows,
  total,
  page,
  pageSize,
  facilities,
  facilityId,
  date,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  facilities: { id: string; name: string }[];
  facilityId: string;
  date: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const selectStyle = 'border-border bg-card text-ink-navy h-11 w-full rounded-md border px-3 text-sm';
  const link = (next: number) =>
    `/admin/thanh-toan?${new URLSearchParams({
      view: 'reconcile',
      ...(facilityId ? { facilityId } : {}),
      ...(date ? { date } : {}),
      page: String(next),
    })}`;

  async function run(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError('');
    setNotice('');
    try {
      await apiFetch('/api/admin/reconcile/run', {
        method: 'POST',
        body: {
          facilityId: String(data.get('facilityId') ?? ''),
          examDate: String(data.get('examDate') ?? ''),
        },
      });
      setNotice('Đã chạy đối soát và cập nhật kết quả.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa chạy được đối soát, vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-5">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-ink-navy text-lg font-semibold">Chạy lại đối soát</h2>
          <p className="text-slate-gray text-sm">
            Chọn cơ sở và ngày khám để đối chiếu lại phiếu, tiền và lịch HIS.
          </p>
        </div>
        <form onSubmit={run} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <FormField id="run-facility" label="Cơ sở">
            <select
              id="run-facility"
              name="facilityId"
              className={selectStyle}
              defaultValue={facilityId}
              required
            >
              <option value="">Chọn cơ sở</option>
              {facilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="run-exam-date" label="Ngày khám">
            <Input id="run-exam-date" name="examDate" type="date" defaultValue={date} required />
          </FormField>
          <Button type="submit" disabled={pending}>
            <RotateCw size={16} />
            {pending ? 'Đang đối soát…' : 'Chạy đối soát'}
          </Button>
        </form>
      </Card>
      <Card className="p-4">
        <form method="GET" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <input type="hidden" name="view" value="reconcile" />
          <FormField id="filter-facility" label="Lọc cơ sở">
            <select id="filter-facility" name="facilityId" className={selectStyle} defaultValue={facilityId}>
              <option value="">Tất cả cơ sở</option>
              {facilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="filter-date" label="Lọc ngày khám">
            <Input id="filter-date" name="date" type="date" defaultValue={date} />
          </FormField>
          <Button variant="outline" type="submit">
            Lọc kết quả
          </Button>
        </form>
      </Card>
      <p className="text-slate-gray text-sm">{total} lượt đối soát trong phạm vi của bạn</p>
      {rows.length ? (
        rows.map((row) => <BatchCard key={row.id} row={row} />)
      ) : (
        <Card>
          <p className="text-slate-gray">Chưa có kết quả đối soát phù hợp bộ lọc.</p>
        </Card>
      )}
      <nav aria-label="Phân trang đối soát" className="flex items-center justify-between text-sm">
        <span>
          Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
        </span>
        <div className="flex gap-4">
          {page > 1 ? (
            <Link href={link(page - 1)} className="text-primary font-semibold">
              ← Trước
            </Link>
          ) : null}
          {page * pageSize < total ? (
            <Link href={link(page + 1)} className="text-primary font-semibold">
              Tiếp →
            </Link>
          ) : null}
        </div>
      </nav>
    </div>
  );
}

function BatchCard({ row }: { row: Row }) {
  const mismatches = row.missingInHis + row.missingInWeb + row.statusChanged + row.amountDiff;
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-ink-navy font-semibold">
            {row.facilityName} · {formatDate(`${row.examDate}T00:00:00Z`)}
          </h2>
          <p className="text-slate-gray text-xs">
            Hoàn tất: {row.finishedAt ? formatDateTime(row.finishedAt) : 'Đang chạy'}
          </p>
        </div>
        <Badge tone={mismatches || row.bank.difference ? 'danger' : 'success'}>
          {mismatches || row.bank.difference ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          {mismatches || row.bank.difference ? 'Có chênh lệch' : 'Đã khớp'}
        </Badge>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <div>
          <dt className="text-slate-gray">Phiếu khớp</dt>
          <dd className="font-semibold">{row.matched}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Thiếu tại HIS</dt>
          <dd className="font-semibold">{row.missingInHis}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Thiếu trên web</dt>
          <dd className="font-semibold">{row.missingInWeb}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Đổi trạng thái</dt>
          <dd className="font-semibold">{row.statusChanged}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Lệch tiền HIS</dt>
          <dd className="font-semibold">{row.amountDiff}</dd>
        </div>
      </dl>
      <div className="bg-pebble grid gap-2 rounded-md p-3 text-sm sm:grid-cols-3">
        <p>
          Tiền vào SePay: <strong>{formatMoney(row.bank.incoming)}</strong>
        </p>
        <p>
          Phiếu đã ghi nhận: <strong>{formatMoney(row.bank.booked)}</strong>
        </p>
        <p>
          Chênh lệch: <strong>{formatMoney(row.bank.difference)}</strong>
        </p>
      </div>
      {row.issues.length ? (
        <details className="text-sm">
          <summary className="text-primary cursor-pointer font-semibold">
            Xem {row.issues.length} mục cần kiểm tra
          </summary>
          <ul className="border-border mt-3 space-y-2 border-t pt-3">
            {row.issues.map((issue, index) => (
              <li key={`${issue.kind}-${index}`} className="flex flex-wrap items-center gap-2">
                <AlertCircle size={16} className="text-danger" aria-hidden="true" />
                <span>{issueLabels[issue.kind] ?? issue.kind}</span>
                <span className="font-semibold">
                  {issue.appointmentCode ?? (issue.hisKey ? `HIS #${issue.hisKey}` : '')}
                </span>
                {issue.webValue !== undefined ? (
                  <span className="text-slate-gray">
                    Web: {issue.webValue} · HIS: {issue.hisValue}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-success flex items-center gap-2 text-sm">
          <Clock3 size={16} /> Không có mục lệch.
        </p>
      )}
    </Card>
  );
}
