'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowDownToLine, CheckCircle2, Clock3, Link2, RotateCw } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { formatDateTime, formatMoney } from '@/lib/utils/format';

interface Row {
  id: string;
  facilityName: string;
  orderCode: string | null;
  providerTxnId: string | null;
  amount: number;
  paidAmount: number | null;
  status: string;
  appointmentCode: string | null;
  appointmentStatus: string | null;
  refundBy: string | null;
  refundApprovedBy: string | null;
  refundRef: string | null;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
}
type Action = 'match' | 'request' | 'complete';
const labels: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  EXPIRED: 'Quá hạn',
  AMOUNT_MISMATCH: 'Lệch số tiền',
  UNMATCHED: 'Chưa khớp phiếu',
  REFUND_PENDING: 'Chờ hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
};
const selectStyle = 'border-border bg-card text-ink-navy h-11 w-full rounded-md border px-3 text-sm';

function statusBadge(status: string) {
  const tone =
    status === 'PAID' || status === 'REFUNDED'
      ? 'success'
      : status === 'UNMATCHED' || status === 'AMOUNT_MISMATCH'
        ? 'danger'
        : 'warning';
  const Icon =
    status === 'PAID' || status === 'REFUNDED'
      ? CheckCircle2
      : status === 'UNMATCHED' || status === 'AMOUNT_MISMATCH'
        ? AlertCircle
        : Clock3;
  return (
    <Badge tone={tone}>
      <Icon size={14} aria-hidden="true" />
      {labels[status] ?? status}
    </Badge>
  );
}

export function PaymentsPanel({
  rows,
  total,
  page,
  pageSize,
  facilities,
  facilityId,
  date,
  status,
  actorId,
  canManage,
  canApprove,
}: {
  rows: Row[];
  total: number;
  page: number;
  pageSize: number;
  facilities: { id: string; name: string }[];
  facilityId: string;
  date: string;
  status: string;
  actorId: string;
  canManage: boolean;
  canApprove: boolean;
}) {
  const router = useRouter();
  const [active, setActive] = useState<{ id: string; action: Action } | null>(null);
  const [pendingId, setPendingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const query = new URLSearchParams({
    ...(facilityId ? { facilityId } : {}),
    ...(date ? { date } : {}),
    ...(status ? { status } : {}),
  });
  const link = (next: number) =>
    `/admin/thanh-toan?${new URLSearchParams({ ...Object.fromEntries(query), page: String(next) })}`;
  const exportUrl = `/api/admin/payments/export?${query}`;

  async function submit(id: string, action: Action | 'approve', body?: Record<string, unknown>) {
    setPendingId(id);
    setError('');
    setNotice('');
    const path =
      action === 'match'
        ? 'match'
        : action === 'request'
          ? 'refund-request'
          : action === 'approve'
            ? 'refund-approve'
            : 'refund-complete';
    try {
      await apiFetch(`/api/admin/payments/${id}/${path}`, { method: 'POST', body: body ?? {} });
      setNotice(
        action === 'match'
          ? 'Đã gán giao dịch cho phiếu.'
          : action === 'approve'
            ? 'Đã duyệt yêu cầu hoàn tiền.'
            : action === 'request'
              ? 'Đã ghi yêu cầu hoàn tiền.'
              : 'Đã xác nhận hoàn tiền.',
      );
      setActive(null);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa lưu được thao tác, vui lòng thử lại.');
    } finally {
      setPendingId('');
    }
  }

  return (
    <div className="space-y-4">
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <Card className="p-4">
        <form method="GET" className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <FormField id="payment-facility" label="Cơ sở">
            <select id="payment-facility" name="facilityId" defaultValue={facilityId} className={selectStyle}>
              <option value="">Tất cả cơ sở</option>
              {facilities.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </FormField>
          <FormField id="payment-date" label="Ngày giao dịch">
            <Input id="payment-date" name="date" type="date" defaultValue={date} />
          </FormField>
          <FormField id="payment-status" label="Trạng thái">
            <select id="payment-status" name="status" defaultValue={status} className={selectStyle}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </FormField>
          <Button type="submit" variant="outline">
            Lọc giao dịch
          </Button>
        </form>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-slate-gray">{total} giao dịch trong phạm vi của bạn</p>
        <Button asChild variant="outline" size="sm">
          <a href={exportUrl}>
            <ArrowDownToLine size={16} /> Xuất CSV
          </a>
        </Button>
      </div>
      {rows.length ? (
        rows.map((row) => (
          <PaymentCard
            key={row.id}
            row={row}
            active={active?.id === row.id ? active.action : null}
            pending={pendingId === row.id}
            actorId={actorId}
            canManage={canManage}
            canApprove={canApprove}
            setActive={(action) => setActive(action ? { id: row.id, action } : null)}
            submit={(action, body) => submit(row.id, action, body)}
          />
        ))
      ) : (
        <Card>
          <p className="text-slate-gray">Chưa có giao dịch phù hợp bộ lọc.</p>
        </Card>
      )}
      <nav aria-label="Phân trang giao dịch" className="flex items-center justify-between text-sm">
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

function PaymentCard({
  row,
  active,
  pending,
  actorId,
  canManage,
  canApprove,
  setActive,
  submit,
}: {
  row: Row;
  active: Action | null;
  pending: boolean;
  actorId: string;
  canManage: boolean;
  canApprove: boolean;
  setActive(action: Action | null): void;
  submit(action: Action | 'approve', body?: Record<string, unknown>): Promise<void>;
}) {
  const canRequest =
    canManage &&
    !row.refundRef &&
    (['UNMATCHED', 'AMOUNT_MISMATCH'].includes(row.status) ||
      (row.status === 'PAID' && ['CHO_HOAN_TIEN', 'DA_HUY'].includes(row.appointmentStatus ?? '')) ||
      (row.status === 'REFUND_PENDING' && !row.refundBy));
  const canComplete = canManage && row.status === 'REFUND_PENDING' && !!row.refundBy;
  const canApproveRow =
    canApprove && row.status === 'REFUND_PENDING' && row.refundBy !== actorId && !row.refundApprovedBy;
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-ink-navy font-semibold">
            {row.orderCode ?? 'Chưa có mã đơn'}{' '}
            <span className="text-slate-gray font-normal">· {row.facilityName}</span>
          </p>
          <p className="text-slate-gray text-xs">
            {formatDateTime(row.paidAt ?? row.createdAt)} · Giao dịch: {row.providerTxnId ?? 'Chưa có'}
          </p>
        </div>
        {statusBadge(row.status)}
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-slate-gray">Số tiền đơn</dt>
          <dd className="font-semibold">{formatMoney(row.amount)}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Thực nhận</dt>
          <dd className="font-semibold">{row.paidAmount === null ? '—' : formatMoney(row.paidAmount)}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Phiếu liên quan</dt>
          <dd>{row.appointmentCode ?? 'Chưa gán'}</dd>
        </div>
        <div>
          <dt className="text-slate-gray">Mã hoàn</dt>
          <dd>{row.refundRef ?? '—'}</dd>
        </div>
      </dl>
      <div className="flex flex-wrap gap-2">
        {canManage && row.status === 'UNMATCHED' ? (
          <Button size="sm" variant="outline" onClick={() => setActive('match')}>
            <Link2 size={16} /> Gán phiếu
          </Button>
        ) : null}
        {canRequest ? (
          <Button size="sm" variant="outline" onClick={() => setActive('request')}>
            <RotateCw size={16} /> Yêu cầu hoàn
          </Button>
        ) : null}
        {canApproveRow ? (
          <Button size="sm" variant="outline" disabled={pending} onClick={() => void submit('approve')}>
            <CheckCircle2 size={16} /> Duyệt hoàn
          </Button>
        ) : null}
        {canComplete ? (
          <Button size="sm" variant="outline" onClick={() => setActive('complete')}>
            <CheckCircle2 size={16} /> Xác nhận đã hoàn
          </Button>
        ) : null}
      </div>
      {active ? (
        <PaymentActionForm
          key={`${row.id}-${active}`}
          row={row}
          action={active}
          pending={pending}
          cancel={() => setActive(null)}
          submit={submit}
        />
      ) : null}
    </Card>
  );
}

function PaymentActionForm({
  row,
  action,
  pending,
  cancel,
  submit,
}: {
  row: Row;
  action: Action;
  pending: boolean;
  cancel(): void;
  submit(action: Action, body: Record<string, unknown>): Promise<void>;
}) {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body =
      action === 'match'
        ? { appointmentCode: String(data.get('appointmentCode') ?? '') }
        : action === 'request'
          ? { amount: Number(data.get('amount')), note: String(data.get('note') ?? '') }
          : {
              // A07 mục 2: giờ nhập trên màn admin là giờ Việt Nam, không phụ thuộc múi giờ máy kế toán.
              refundedAt: `${String(data.get('refundedAt'))}:00+07:00`,
              refundRef: String(data.get('refundRef') ?? ''),
              note: String(data.get('note') ?? ''),
            };
    void submit(action, body);
  }
  const suggested =
    row.status === 'AMOUNT_MISMATCH' && row.paidAmount && row.paidAmount > row.amount
      ? row.paidAmount - row.amount
      : (row.paidAmount ?? row.amount);
  return (
    <form onSubmit={onSubmit} className="bg-pebble grid gap-3 rounded-md p-4 sm:grid-cols-2">
      {action === 'match' ? (
        <FormField id={`match-${row.id}`} label="Mã phiếu cần gán">
          <Input
            id={`match-${row.id}`}
            name="appointmentCode"
            required
            maxLength={40}
            placeholder="MQ7F3K9A"
          />
        </FormField>
      ) : null}
      {action === 'request' ? (
        <>
          <FormField
            id={`amount-${row.id}`}
            label="Số tiền hoàn (VND)"
            hint="Khoản trên 2.000.000đ cần người khác duyệt."
          >
            <Input
              id={`amount-${row.id}`}
              name="amount"
              type="number"
              min="1"
              step="1"
              defaultValue={suggested}
              required
            />
          </FormField>
          <FormField id={`reason-${row.id}`} label="Lý do yêu cầu">
            <Input id={`reason-${row.id}`} name="note" minLength={3} maxLength={500} required />
          </FormField>
        </>
      ) : null}
      {action === 'complete' ? (
        <>
          <FormField id={`date-${row.id}`} label="Ngày giờ chuyển hoàn (giờ Việt Nam)">
            <Input id={`date-${row.id}`} name="refundedAt" type="datetime-local" required />
          </FormField>
          <FormField id={`ref-${row.id}`} label="Mã giao dịch hoàn">
            <Input id={`ref-${row.id}`} name="refundRef" minLength={3} maxLength={100} required />
          </FormField>
          <FormField id={`note-${row.id}`} label="Ghi chú">
            <Input id={`note-${row.id}`} name="note" maxLength={500} />
          </FormField>
        </>
      ) : null}
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button size="sm" type="submit" disabled={pending}>
          {pending ? 'Đang lưu…' : 'Lưu thao tác'}
        </Button>
        <Button size="sm" type="button" variant="outline" onClick={cancel}>
          Đóng
        </Button>
      </div>
    </form>
  );
}
