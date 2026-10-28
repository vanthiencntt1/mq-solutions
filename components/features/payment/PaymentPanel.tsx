'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  Landmark,
  LoaderCircle,
  ReceiptText,
} from 'lucide-react';
import { apiFetch } from '@/components/common/api-client';
import { track } from '@/components/features/analytics/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { ProductFrame } from '@/components/ui/product-frame';
import { BookingStepper } from '@/components/features/booking/booking-stepper';
import { BookingSummary } from '@/components/features/booking/booking-summary';
import { PAY_APPS, isPayApp, type PayAppId } from '@/components/features/payment/payment-methods';
import type { PaymentView } from '@/lib/domain/payment/types';
import { formatDateTime, formatMoney } from '@/lib/utils/format';

function countdown(expiresAt: string, now: number): string {
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function statusMessage(data: PaymentView, expired: boolean) {
  if (data.appointmentStatus === 'DA_CO_STT' && data.paymentStatus === 'PAID')
    return { tone: 'success' as const, text: 'Thanh toán thành công. Đang mở phiếu khám của bạn.' };
  if (data.appointmentStatus === 'CHO_HOAN_TIEN' || data.paymentStatus === 'REFUND_PENDING')
    return {
      tone: 'warning' as const,
      text: 'Tiền đã đến sau hạn giữ chỗ và số khám không còn. Cơ sở sẽ liên hệ để hoàn tiền.',
    };
  if (data.paymentStatus === 'AMOUNT_MISMATCH')
    return {
      tone: 'warning' as const,
      text: 'Số tiền chuyển chưa khớp. Kế toán cơ sở sẽ kiểm tra giao dịch; vui lòng không chuyển thêm tiền.',
    };
  if (data.appointmentStatus === 'LOI_HIS')
    return {
      tone: 'warning' as const,
      text: 'Đã nhận tiền. Cơ sở đang đồng bộ phiếu khám, vui lòng chờ cập nhật.',
    };
  if (data.paymentStatus === 'PAID')
    return { tone: 'info' as const, text: 'Đã nhận tiền. Đang lấy số thứ tự khám từ cơ sở.' };
  if (expired || data.paymentStatus === 'EXPIRED' || data.appointmentStatus === 'QUA_HAN')
    return {
      tone: 'danger' as const,
      text: 'Đã hết thời gian giữ chỗ. Nếu bạn vừa chuyển tiền, hệ thống vẫn tiếp tục kiểm tra giao dịch.',
    };
  return { tone: 'warning' as const, text: 'Đang chờ ngân hàng xác nhận chuyển khoản.' };
}

export function PaymentPanel({
  initial,
  initialNow,
  initialApp,
}: {
  initial: PaymentView;
  initialNow: number;
  initialApp?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const [app, setApp] = useState<PayAppId>(isPayApp(initialApp) ? initialApp : 'bank');
  const appInfo = PAY_APPS.find((item) => item.id === app) ?? PAY_APPS[0];
  const [now, setNow] = useState(initialNow);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [failedImageUrl, setFailedImageUrl] = useState('');
  const sentPayment = useRef(false);
  const sentQueue = useRef(false);
  const expired = now >= new Date(data.expiresAt).getTime();
  const message = statusMessage(data, expired);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (data.paymentStatus === 'PAID' && !sentPayment.current) {
      sentPayment.current = true;
      track('payment_success');
    }
    if (data.appointmentStatus === 'DA_CO_STT' && !sentQueue.current) {
      sentQueue.current = true;
      track('queue_number_ready');
    }
  }, [data.paymentStatus, data.appointmentStatus]);

  useEffect(() => {
    if (data.appointmentStatus === 'DA_CO_STT' && data.paymentStatus === 'PAID') {
      router.replace(`/tai-khoan/phieu-kham/${encodeURIComponent(data.code)}`);
      return;
    }
    let active = true;
    let timer: number;
    const poll = async () => {
      try {
        const next = await apiFetch<PaymentView>(`/api/bookings/${encodeURIComponent(data.code)}/payment`);
        if (active) {
          setData(next);
          setError('');
        }
      } catch {
        if (active) setError('Chưa cập nhật được trạng thái. Hệ thống sẽ tự thử lại.');
      }
      if (active) timer = window.setTimeout(poll, 3000);
    };
    timer = window.setTimeout(poll, 3000);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [data.code, data.appointmentStatus, data.paymentStatus, router]);

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(''), 2000);
    } catch {
      setError('Chưa sao chép được. Vui lòng chọn và sao chép thông tin bằng tay.');
    }
  }

  const qr = !expired && data.paymentStatus === 'PENDING' ? data.qr : null;
  return (
    <div className="space-y-8 pb-16">
      <BookingStepper current={3} />
      <header className="space-y-2">
        <p className="text-primary text-sm font-semibold">BƯỚC 4 / 4</p>
        <h1 className="text-ink-navy md:text-heading-sm text-[40px] leading-tight font-bold">
          Thanh toán đặt khám
        </h1>
        <p className="text-slate-gray">Chuyển đúng số tiền và nội dung để cơ sở xác nhận tự động.</p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-6">
          <div aria-live="polite" className="space-y-3">
            <Alert tone={message.tone}>
              {message.tone === 'success' ? (
                <CheckCircle2 className="mr-2 inline size-5" aria-hidden />
              ) : message.tone === 'danger' ? (
                <CircleAlert className="mr-2 inline size-5" aria-hidden />
              ) : (
                <Clock3 className="mr-2 inline size-5" aria-hidden />
              )}
              {message.text}
            </Alert>
            {error && (
              <Alert tone="danger">
                <CircleAlert className="mr-2 inline size-4" aria-hidden />
                {error}
              </Alert>
            )}
          </div>

          {qr ? (
            <Card
              variant="panel"
              className="grid gap-8 p-4 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-6"
            >
              <section className="space-y-4 text-center" aria-label="Mã VietQR">
                <ProductFrame className="mx-auto w-full max-w-[320px]">
                  <div className="bg-card p-3">
                    {failedImageUrl === qr.qrImageUrl ? (
                      <div className="text-slate-gray flex aspect-square flex-col items-center justify-center gap-3 p-4 text-sm">
                        <CircleAlert className="text-warning size-8" aria-hidden />
                        <span>Chưa tải được mã QR. Bạn có thể chuyển khoản bằng thông tin bên cạnh.</span>
                      </div>
                    ) : (
                      // Ảnh QR từ VietQR giữ URL động theo tài khoản và mã đơn của cơ sở.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qr.qrImageUrl}
                        alt={`Mã VietQR thanh toán phiếu ${data.code}`}
                        className="aspect-square w-full object-contain"
                        onError={() => setFailedImageUrl(qr.qrImageUrl)}
                      />
                    )}
                  </div>
                </ProductFrame>
                <Button asChild variant="outline" className="w-full max-w-[320px]">
                  <a
                    href={`/api/payment/qr/${encodeURIComponent(data.code)}`}
                    download={`${data.code}-vietqr.png`}
                  >
                    <Download className="size-4" aria-hidden /> Tải ảnh QR
                  </a>
                </Button>
                <p className="text-slate-gray text-sm">Mở ứng dụng ngân hàng và quét mã QR để thanh toán.</p>
              </section>

              <section className="space-y-5" aria-label="Thông tin chuyển khoản">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Badge tone="warning" className="px-4 py-2 text-base font-bold tabular-nums">
                    <Clock3 className="size-5" aria-hidden /> Còn {countdown(data.expiresAt, now)}
                  </Badge>
                  <span className="text-slate-gray text-sm">Hạn {formatDateTime(data.expiresAt)}</span>
                </div>
                <div>
                  <p className="text-slate-gray text-sm">Số tiền cần chuyển</p>
                  <p className="text-ink-navy mt-1 text-[32px] font-bold tabular-nums">
                    {formatMoney(data.amount)}
                  </p>
                </div>
                <dl className="border-hairline divide-hairline divide-y border-y">
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-slate-gray flex items-center gap-2 text-sm">
                      <Landmark className="size-4" aria-hidden /> Ngân hàng
                    </dt>
                    <dd className="font-semibold">{qr.bankCode}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-slate-gray text-sm">Chủ tài khoản</dt>
                    <dd className="text-right font-semibold">{qr.accountName}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-slate-gray text-sm">Số tài khoản</dt>
                    <dd className="flex flex-col items-end gap-2">
                      <strong className="text-lg tabular-nums">{qr.accountNo}</strong>
                      <Button size="sm" variant="outline" onClick={() => copy(qr.accountNo, 'account')}>
                        <Copy className="size-4" aria-hidden />
                        {copied === 'account' ? 'Đã sao chép' : 'Sao chép'}
                      </Button>
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 py-3">
                    <dt className="text-slate-gray flex items-center gap-2 text-sm">
                      <ReceiptText className="size-4" aria-hidden /> Nội dung
                    </dt>
                    <dd className="flex flex-col items-end gap-2">
                      <strong className="text-lg tracking-wide">{qr.content}</strong>
                      <Button size="sm" variant="outline" onClick={() => copy(qr.content, 'content')}>
                        <Copy className="size-4" aria-hidden />
                        {copied === 'content' ? 'Đã sao chép' : 'Sao chép'}
                      </Button>
                    </dd>
                  </div>
                </dl>
                <div className="border-hairline space-y-3 rounded-xl border p-4" aria-label="Cách thanh toán">
                  <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Ứng dụng thanh toán">
                    {PAY_APPS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        role="radio"
                        aria-checked={app === item.id}
                        onClick={() => setApp(item.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                          app === item.id
                            ? 'border-primary bg-primary text-white'
                            : 'border-hairline text-slate-gray hover:bg-pebble'
                        }`}
                      >
                        {item.id === 'bank' ? 'Ngân hàng' : item.title.replace('Ví ', '')}
                      </button>
                    ))}
                  </div>
                  <p className="text-ink-navy text-sm">{appInfo.steps}</p>
                  {qr.checkoutUrl && (
                    <Button asChild variant="outline" size="sm">
                      <a href={qr.checkoutUrl} target="_blank" rel="noreferrer">
                        <ExternalLink className="size-4" aria-hidden /> Mở trang thanh toán PayOS
                      </a>
                    </Button>
                  )}
                </div>
                <p className="text-slate-gray text-sm">
                  Tiền được chuyển trực tiếp tới tài khoản của {data.facilityName}. Hệ thống tự kiểm tra giao
                  dịch sau mỗi 3 giây.
                </p>
              </section>
            </Card>
          ) : (
            <Card variant="panel" className="space-y-4 p-4 text-center md:p-6">
              {data.paymentStatus === 'PAID' ? (
                <LoaderCircle className="text-primary mx-auto size-8 animate-spin" aria-hidden />
              ) : (
                <CircleAlert className="text-warning mx-auto size-8" aria-hidden />
              )}
              <h2 className="section-title">
                {data.paymentStatus === 'PAID' ? 'Đang hoàn tất phiếu khám' : 'Mã QR không còn hiệu lực'}
              </h2>
              <p className="text-slate-gray text-sm">
                Mã phiếu: <strong>{data.code}</strong>
              </p>
              {data.appointmentStatus === 'DA_CO_STT' && (
                <Button asChild>
                  <Link href={`/tai-khoan/phieu-kham/${encodeURIComponent(data.code)}`}>
                    <Check className="size-4" aria-hidden /> Xem phiếu khám
                  </Link>
                </Button>
              )}
            </Card>
          )}
        </div>
        <aside aria-label="Tóm tắt lịch khám" className="lg:sticky lg:top-24">
          <BookingSummary data={{ facilityName: data.facilityName, amount: data.amount }} />
        </aside>
      </div>
    </div>
  );
}
