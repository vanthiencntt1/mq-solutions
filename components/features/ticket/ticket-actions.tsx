'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, XCircle } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function TicketActions({
  code,
  canCancel,
  canRefresh,
}: {
  code: string;
  canCancel: boolean;
  canRefresh: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);
  async function refresh() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await apiFetch(`/api/me/appointments/${code}/refresh`, { method: 'POST' });
      setMessage('Đã cập nhật số thứ tự từ cơ sở.');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chưa tải lại được số thứ tự.');
    } finally {
      setBusy(false);
    }
  }
  async function cancel(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const result = await apiFetch<{ requested: boolean }>(`/api/me/appointments/${code}/cancel`, {
        method: 'POST',
        body: { reason },
      });
      setMessage(
        result.requested ? 'Yêu cầu hủy đã chuyển tới cơ sở. Vui lòng chờ xử lý.' : 'Phiếu khám đã được hủy.',
      );
      setShowCancel(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Chưa hủy được phiếu.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {canRefresh ? (
          <Button variant="outline" disabled={busy} onClick={refresh}>
            <RefreshCw aria-hidden /> Tải lại STT
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="outline" disabled={busy} onClick={() => setShowCancel((v) => !v)}>
            <XCircle aria-hidden /> Hủy phiếu
          </Button>
        ) : null}
      </div>
      {showCancel ? (
        <form onSubmit={cancel} className="border-hairline bg-pebble space-y-3 rounded-xl border p-4 sm:p-5">
          <label htmlFor="cancel-reason" className="block font-semibold">
            Lý do hủy phiếu
          </label>
          <Input
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            minLength={3}
            maxLength={300}
            required
            placeholder="Nhập lý do hủy"
          />
          <p className="text-slate-gray text-sm">Sau khi xác nhận, số thứ tự sẽ không còn hiệu lực.</p>
          <Button type="submit" variant="danger" disabled={busy || reason.trim().length < 3}>
            {busy ? 'Đang xử lý…' : 'Xác nhận hủy'}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-success">
          {message}
        </p>
      ) : null}
    </div>
  );
}
