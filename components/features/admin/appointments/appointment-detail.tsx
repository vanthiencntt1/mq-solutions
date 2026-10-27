'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Clock3, Send } from 'lucide-react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils/format';

interface Detail {
  code: string;
  patientName: string;
  maBN: string | null;
  isNewPatient: boolean;
  facilityName: string;
  specialtyName: string;
  doctorName: string | null;
  roomName: string;
  examDate: string;
  slotLabel: string;
  objectType: string;
  payMethod: string;
  bookingApi: string;
  amount: number;
  stt: number | null;
  hisBookingId: string | null;
  hisError: string | null;
  status: string;
  cancelRequest: boolean;
  checkedInAt: string | null;
  paidAt: string | null;
  createdAt: string;
  qrToken: string;
  events: {
    fromStatus: string | null;
    toStatus: string;
    actorType: string;
    note: string | null;
    at: string;
  }[];
  outbox: {
    command: string;
    attempts: number;
    lastError: string | null;
    nextRunAt: string;
    doneAt: string | null;
    createdAt: string;
  }[];
}

const STATUS_LABELS: Record<string, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  QUA_HAN: 'Quá hạn',
  DA_THANH_TOAN: 'Đã thanh toán',
  DANG_GUI_HIS: 'Đang gửi HIS',
  LOI_HIS: 'Lỗi HIS',
  DA_CO_STT: 'Đã có STT',
  DA_KHAM: 'Đã khám',
  DA_HUY: 'Đã hủy',
  CHO_HOAN_TIEN: 'Chờ hoàn tiền',
  DA_HOAN_TIEN: 'Đã hoàn tiền',
};

export function AppointmentDetail({ detail, canCancel }: { detail: Detail; canCancel: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [note, setNote] = useState('');
  const [stt, setStt] = useState('');
  const [hisBookingId, setHisBookingId] = useState('');

  async function act(body: Record<string, unknown>, success: string) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await apiFetch<{ requested?: boolean }>(
        `/api/admin/appointments/${detail.code}/actions`,
        { method: 'POST', body },
      );
      setNotice(
        result.requested ? 'HIS từ chối hủy tự động. Đã tạo yêu cầu để cơ sở xử lý trên HIS.' : success,
      );
      setNote('');
      setStt('');
      setHisBookingId('');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa xử lý được phiếu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <header>
        <p className="text-primary text-sm font-semibold">A06 · CHI TIẾT PHIẾU</p>
        <h1 className="text-ink-navy text-[28px] font-bold">{detail.code}</h1>
        <p className="text-slate-gray text-sm">
          {detail.facilityName} · {formatDate(detail.examDate)} · {detail.slotLabel}
        </p>
      </header>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-ink-navy text-lg font-bold">Thông tin khám</h2>
            <Badge
              tone={
                detail.status === 'LOI_HIS' ? 'danger' : detail.status === 'DA_CO_STT' ? 'success' : 'info'
              }
            >
              {detail.status === 'LOI_HIS' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
              {STATUS_LABELS[detail.status] ?? detail.status}
            </Badge>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-gray">Bệnh nhân</dt>
              <dd className="font-semibold">
                {detail.patientName}
                {detail.isNewPatient ? ' · Bệnh nhân mới' : ''}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">MaBN</dt>
              <dd>{detail.maBN ?? 'Chưa có'}</dd>
            </div>
            <div>
              <dt className="text-slate-gray">Khoa · bác sĩ</dt>
              <dd>
                {detail.specialtyName} · {detail.doctorName ?? 'Chưa phân công'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Phòng · STT</dt>
              <dd>
                {detail.roomName} · {detail.stt ?? 'Chưa cấp'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Đối tượng · API</dt>
              <dd>
                {detail.objectType} · {detail.bookingApi}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Thanh toán</dt>
              <dd>
                {detail.payMethod === 'ONLINE' ? 'Online' : 'Tại viện'} · {formatMoney(detail.amount)}
              </dd>
            </div>
            <div>
              <dt className="text-slate-gray">Mã HIS / IDDK</dt>
              <dd>{detail.hisBookingId ?? 'Chưa có'}</dd>
            </div>
            <div>
              <dt className="text-slate-gray">Check-in</dt>
              <dd>{detail.checkedInAt ? formatDateTime(detail.checkedInAt) : 'Chưa đến'}</dd>
            </div>
          </dl>
          {detail.hisError ? (
            <p className="text-danger mt-4 flex gap-2 text-sm">
              <AlertCircle size={17} /> Lỗi HIS: {detail.hisError}
            </p>
          ) : null}
          {detail.cancelRequest ? (
            <p className="text-warning mt-4 flex gap-2 text-sm font-semibold">
              <AlertCircle size={17} /> Có yêu cầu hủy cần xử lý trên HIS.
            </p>
          ) : null}
        </Card>
        <Card>
          <h2 className="text-ink-navy text-lg font-bold">Thao tác</h2>
          <div className="mt-4 space-y-4">
            {detail.status === 'LOI_HIS' ? (
              <Button
                disabled={busy}
                onClick={() => act({ action: 'retry' }, 'Đã đưa lệnh vào hàng đợi HIS.')}
                variant="outline"
                className="w-full"
              >
                <Send size={17} /> Gửi lại HIS
              </Button>
            ) : null}
            {['DA_CO_STT', 'DA_KHAM'].includes(detail.status) ? (
              <Button
                disabled={busy}
                onClick={() => act({ action: 'resend' }, 'Đã đưa email phiếu khám vào hàng đợi.')}
                variant="outline"
                className="w-full"
              >
                <Send size={17} /> Gửi lại phiếu qua email
              </Button>
            ) : null}
            <FormField id="a06-note" label="Ghi chú / xác nhận hủy">
              <textarea
                id="a06-note"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={1000}
                className="border-border w-full rounded-md border p-3 text-sm"
              />
            </FormField>
            <Button
              disabled={busy || note.trim().length < 2}
              variant="outline"
              onClick={() => act({ action: 'note', note }, 'Đã lưu ghi chú.')}
              className="w-full"
            >
              Lưu ghi chú
            </Button>
            {detail.cancelRequest && canCancel ? (
              <Button
                disabled={busy || note.trim().length < 5}
                variant="danger"
                onClick={() =>
                  act({ action: 'confirm-cancel', note }, 'Đã xác nhận hủy trên HIS và cập nhật phiếu.')
                }
                className="w-full"
              >
                Xác nhận đã hủy trên HIS
              </Button>
            ) : null}
            {detail.status === 'DA_CO_STT' && !detail.cancelRequest && canCancel ? (
              <Button
                disabled={busy || note.trim().length < 5}
                variant="danger"
                onClick={() => {
                  if (window.confirm(`Hủy phiếu ${detail.code} trên HIS?`))
                    void act({ action: 'cancel', note }, 'Đã hủy phiếu trên HIS.');
                }}
                className="w-full"
              >
                Hủy phiếu trên HIS
              </Button>
            ) : null}
            {['LOI_HIS', 'DANG_GUI_HIS'].includes(detail.status) ? (
              <div className="border-border space-y-3 border-t pt-4">
                <p className="text-sm font-semibold">HIS đã cấp STT thủ công</p>
                <FormField id="a06-stt" label="STT">
                  <input
                    id="a06-stt"
                    type="number"
                    min="1"
                    value={stt}
                    onChange={(e) => setStt(e.target.value)}
                    className="border-border h-11 w-full rounded-md border px-3"
                  />
                </FormField>
                <FormField id="a06-his-id" label="Mã HIS / IDDK">
                  <input
                    id="a06-his-id"
                    value={hisBookingId}
                    onChange={(e) => setHisBookingId(e.target.value)}
                    className="border-border h-11 w-full rounded-md border px-3"
                  />
                </FormField>
                <Button
                  disabled={busy || !Number.isInteger(Number(stt)) || Number(stt) < 1 || !hisBookingId.trim()}
                  variant="outline"
                  onClick={() =>
                    act({ action: 'set-stt', stt: Number(stt), hisBookingId }, 'Đã cập nhật STT từ HIS.')
                  }
                  className="w-full"
                >
                  Lưu STT
                </Button>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-ink-navy text-lg font-bold">Dòng thời gian</h2>
          <ol className="mt-4 space-y-4">
            {detail.events.map((item, index) => (
              <li key={`${item.at}-${index}`} className="border-border border-l-2 pl-4 text-sm">
                <p className="font-semibold">
                  <Clock3 className="mr-1 inline size-4" />
                  {STATUS_LABELS[item.toStatus] ?? item.toStatus}
                </p>
                <p className="text-slate-gray">
                  {formatDateTime(item.at)} · {item.actorType}
                </p>
                {item.note ? <p className="mt-1">{item.note}</p> : null}
              </li>
            ))}
          </ol>
        </Card>
        <Card>
          <h2 className="text-ink-navy text-lg font-bold">Lịch sử gửi HIS</h2>
          {detail.outbox.length ? (
            <ol className="mt-4 space-y-4">
              {detail.outbox.map((item, index) => (
                <li key={`${item.createdAt}-${index}`} className="border-border border-l-2 pl-4 text-sm">
                  <p className="font-semibold">
                    {item.command} · {item.doneAt ? 'Hoàn tất' : 'Đang chờ'}
                  </p>
                  <p className="text-slate-gray">
                    {item.attempts} lần thử · {formatDateTime(item.createdAt)}
                  </p>
                  {item.lastError ? <p className="text-danger mt-1">{item.lastError}</p> : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-slate-gray mt-4 text-sm">Chưa có lệnh gửi lại.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
