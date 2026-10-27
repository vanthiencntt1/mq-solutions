'use client';

import { CalendarDays, CircleAlert, CreditCard, Hospital, LoaderCircle, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { track } from '@/components/features/analytics/client';
import { BookingStepper } from '@/components/features/booking/booking-stepper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import type { BookingView, PreparedBooking } from '@/lib/domain/booking/confirm';
import { formatDate, formatMoney } from '@/lib/utils/format';

type Prepared = PreparedBooking;

// api-client hiện chưa nhận custom header; POST này cần Idempotency-Key theo C06 mục 7.
async function postBooking(draftId: string, payMethod: 'ONLINE' | 'AT_FACILITY'): Promise<BookingView> {
  const storageKey = `mq:c06:idem:${draftId}`;
  let key = sessionStorage.getItem(storageKey);
  if (!key) {
    key = crypto.randomUUID();
    sessionStorage.setItem(storageKey, key);
  }
  const res = await fetch('/api/bookings', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
    body: JSON.stringify({ draftId, payMethod, acceptedTerms: true }),
  });
  const json = (await res.json()) as { data?: BookingView; error?: { message: string } };
  if (!res.ok || !json.data)
    throw new Error(json.error?.message ?? 'Chưa xác nhận được phiếu, vui lòng thử lại');
  return json.data;
}

export function ConfirmStep({ data }: { data: Prepared }) {
  const router = useRouter();
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'AT_FACILITY'>(data.payOptions[0] ?? 'AT_FACILITY');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function confirm() {
    if (!accepted) return;
    setBusy(true);
    setError('');
    try {
      const booking = await postBooking(data.draft.id, payMethod);
      track('booking_confirmed', { payment_method: payMethod, object_type: data.draft.objectType });
      router.push(
        payMethod === 'ONLINE'
          ? `/dat-kham/thanh-toan?code=${encodeURIComponent(booking.code)}`
          : `/tai-khoan/phieu-kham/${encodeURIComponent(booking.code)}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể đặt khám lúc này');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-16">
      <BookingStepper current={2} />
      <header>
        <p className="text-primary text-sm font-semibold">CHẶNG 3 / 4</p>
        <h1 className="text-ink-navy text-3xl font-bold">Xác nhận đặt khám</h1>
        <p className="text-slate-gray mt-2">Kiểm tra lịch và chọn hình thức thanh toán.</p>
      </header>
      {error && (
        <Alert tone="danger">
          <CircleAlert className="mr-2 inline size-4" aria-hidden />
          {error}
        </Alert>
      )}
      <Card className="space-y-5">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CalendarDays className="text-primary size-5" aria-hidden />
          Lịch đã chọn
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-slate-gray text-sm">Cơ sở</dt>
            <dd className="font-semibold">{data.draft.facilityName}</dd>
          </div>
          <div>
            <dt className="text-slate-gray text-sm">Chuyên khoa</dt>
            <dd className="font-semibold">{data.draft.specialtyName}</dd>
          </div>
          <div>
            <dt className="text-slate-gray text-sm">Ngày và giờ</dt>
            <dd className="font-semibold">
              {formatDate(`${data.draft.examDate}T00:00:00+07:00`)} · {data.draft.slotLabel}
            </dd>
          </div>
          <div>
            <dt className="text-slate-gray text-sm">Phòng khám</dt>
            <dd className="font-semibold">{data.draft.roomName}</dd>
          </div>
          {data.draft.doctorName && (
            <div>
              <dt className="text-slate-gray text-sm">Bác sĩ</dt>
              <dd className="font-semibold">{data.draft.doctorName}</dd>
            </div>
          )}
          <div>
            <dt className="text-slate-gray text-sm">Đối tượng</dt>
            <dd className="font-semibold">{data.draft.objectType === 'BHYT' ? 'BHYT' : 'Dịch vụ'}</dd>
          </div>
        </dl>
        <p className="border-hairline border-t pt-4 text-lg font-bold">
          Chi phí dự kiến: {formatMoney(data.draft.amount)}
        </p>
      </Card>
      <Card className="space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="text-primary size-5" aria-hidden />
          Hình thức thanh toán
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.payOptions.includes('ONLINE') && (
            <label
              className={`border-hairline flex min-h-20 cursor-pointer gap-3 rounded-lg border p-4 ${payMethod === 'ONLINE' ? 'ring-primary ring-2' : ''}`}
            >
              <input
                type="radio"
                name="pay"
                checked={payMethod === 'ONLINE'}
                onChange={() => setPayMethod('ONLINE')}
              />
              <span>
                <strong>Thanh toán online</strong>
                <small className="text-slate-gray block">Nhận mã VietQR sau khi xác nhận</small>
              </span>
            </label>
          )}
          {data.payOptions.includes('AT_FACILITY') && (
            <label
              className={`border-hairline flex min-h-20 cursor-pointer gap-3 rounded-lg border p-4 ${payMethod === 'AT_FACILITY' ? 'ring-primary ring-2' : ''}`}
            >
              <input
                type="radio"
                name="pay"
                checked={payMethod === 'AT_FACILITY'}
                onChange={() => setPayMethod('AT_FACILITY')}
              />
              <span>
                <strong>Thanh toán tại viện</strong>
                <small className="text-slate-gray block">Đóng tiền ở quầy trước khi khám</small>
              </span>
            </label>
          )}
        </div>
        {data.draft.objectType === 'BHYT' && (
          <Alert tone="info">
            <Hospital className="mr-2 inline size-4" aria-hidden />
            Mang thẻ BHYT hoặc CCCD gắn chip và giấy chuyển tuyến nếu có.
          </Alert>
        )}
      </Card>
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 size-5"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        <span>Tôi xác nhận thông tin trên chính xác và đồng ý điều khoản đặt khám của cơ sở.</span>
      </label>
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Quay lại
        </Button>
        <Button onClick={confirm} disabled={!accepted || busy || data.payOptions.length === 0}>
          <ShieldCheck className="size-4" aria-hidden />
          {busy ? (
            <>
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Đang xác nhận
            </>
          ) : (
            'Xác nhận đặt khám'
          )}
        </Button>
      </div>
    </div>
  );
}
