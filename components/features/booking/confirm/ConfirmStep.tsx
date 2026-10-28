'use client';

import {
  CalendarDays,
  CircleAlert,
  CreditCard,
  Hospital,
  LoaderCircle,
  MapPin,
  QrCode,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PaymentMethodDialog, type PayAppId } from '@/components/features/payment/payment-methods';
import { useState } from 'react';
import { track } from '@/components/features/analytics/client';
import { BookingStepper } from '@/components/features/booking/booking-stepper';
import { BookingPanelHeading } from '@/components/features/booking/booking-panel-heading';
import { BookingSummary } from '@/components/features/booking/booking-summary';
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

export function ConfirmStep({ data, facilityLogoUrl }: { data: Prepared; facilityLogoUrl?: string | null }) {
  const router = useRouter();
  const [payMethod, setPayMethod] = useState<'ONLINE' | 'AT_FACILITY'>(data.payOptions[0] ?? 'AT_FACILITY');
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [choosingApp, setChoosingApp] = useState(false);

  function confirm() {
    if (!accepted) return;
    // Online: hỏi cách trả (ngân hàng / ví) trước khi tạo phiếu, giống các app đặt khám quen thuộc.
    if (payMethod === 'ONLINE') setChoosingApp(true);
    else void submit();
  }

  async function submit(app?: PayAppId) {
    setBusy(true);
    setError('');
    try {
      const booking = await postBooking(data.draft.id, payMethod);
      track('booking_confirmed', { payment_method: payMethod, object_type: data.draft.objectType });
      router.push(
        payMethod === 'ONLINE'
          ? `/dat-kham/thanh-toan?code=${encodeURIComponent(booking.code)}${app ? `&app=${app}` : ''}`
          : `/tai-khoan/phieu-kham/${encodeURIComponent(booking.code)}`,
      );
    } catch (e) {
      setChoosingApp(false);
      setError(e instanceof Error ? e.message : 'Không thể đặt khám lúc này');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8 pb-16">
      <BookingStepper current={2} />
      <header>
        <p className="text-primary text-sm font-semibold">BƯỚC 3 / 4</p>
        <h1 className="text-ink-navy md:text-heading-sm text-[40px] leading-tight font-bold">
          Xác nhận đặt khám
        </h1>
        <p className="text-slate-gray mt-2">Kiểm tra lịch và chọn hình thức thanh toán.</p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          {error && (
            <Alert tone="danger">
              <CircleAlert className="mr-2 inline size-4" aria-hidden />
              {error}
            </Alert>
          )}
          <Card variant="panel" className="space-y-5">
            <BookingPanelHeading icon={CalendarDays} title="Lịch đã chọn" />
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex gap-3">
                <Hospital className="text-primary size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-slate-gray text-sm">Cơ sở</dt>
                  <dd className="font-semibold">{data.draft.facilityName}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Stethoscope className="text-primary size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-slate-gray text-sm">Chuyên khoa</dt>
                  <dd className="font-semibold">{data.draft.specialtyName}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <CalendarDays className="text-primary size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-slate-gray text-sm">Ngày và giờ</dt>
                  <dd className="font-semibold">
                    {formatDate(`${data.draft.examDate}T00:00:00+07:00`)} · {data.draft.slotLabel}
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <MapPin className="text-primary size-5 shrink-0" aria-hidden />
                <div>
                  <dt className="text-slate-gray text-sm">Phòng khám</dt>
                  <dd className="font-semibold">{data.draft.roomName}</dd>
                </div>
              </div>
              {data.draft.doctorName && (
                <div className="flex gap-3">
                  <UserRound className="text-primary size-5 shrink-0" aria-hidden />
                  <div>
                    <dt className="text-slate-gray text-sm">Bác sĩ</dt>
                    <dd className="font-semibold">{data.draft.doctorName}</dd>
                  </div>
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
          <Card variant="panel" className="space-y-4">
            <BookingPanelHeading icon={CreditCard} title="Hình thức thanh toán" />
            <div className="grid gap-3 sm:grid-cols-2">
              {data.payOptions.includes('ONLINE') && (
                <label
                  className={`border-hairline flex min-h-24 cursor-pointer gap-3 rounded-xl border p-4 ${payMethod === 'ONLINE' ? 'border-primary bg-info-bg ring-primary ring-2' : 'bg-card hover:bg-pebble'}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === 'ONLINE'}
                    onChange={() => setPayMethod('ONLINE')}
                  />
                  <QrCode className="text-primary size-6 shrink-0" strokeWidth={1.75} aria-hidden />
                  <span>
                    <strong>Thanh toán online</strong>
                    <small className="text-slate-gray block">
                      Ngân hàng, MoMo, ZaloPay, ShopeePay, Viettel Money – có số thứ tự ngay
                    </small>
                  </span>
                </label>
              )}
              {data.payOptions.includes('AT_FACILITY') && (
                <label
                  className={`border-hairline flex min-h-24 cursor-pointer gap-3 rounded-xl border p-4 ${payMethod === 'AT_FACILITY' ? 'border-primary bg-info-bg ring-primary ring-2' : 'bg-card hover:bg-pebble'}`}
                >
                  <input
                    type="radio"
                    name="pay"
                    checked={payMethod === 'AT_FACILITY'}
                    onChange={() => setPayMethod('AT_FACILITY')}
                  />
                  <Hospital className="text-primary size-6 shrink-0" strokeWidth={1.75} aria-hidden />
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
        <aside aria-label="Tóm tắt lịch khám" className="lg:sticky lg:top-24">
          <BookingSummary
            data={{
              facilityName: data.draft.facilityName,
              facilityLogoUrl,
              specialtyName: data.draft.specialtyName,
              date: data.draft.examDate.split('-').reverse().join('/'),
              time: data.draft.slotLabel,
              roomName: data.draft.roomName,
              amount: data.draft.amount,
            }}
          />
        </aside>
      </div>
      <PaymentMethodDialog
        open={choosingApp}
        amount={data.draft.amount}
        busy={busy}
        onClose={() => setChoosingApp(false)}
        onConfirm={(app) => void submit(app)}
      />
    </div>
  );
}
