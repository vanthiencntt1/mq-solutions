'use client';

import { useEffect, useState } from 'react';
import { Check, Landmark, LoaderCircle, Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/utils/format';

// Mọi lựa chọn đều trả bằng VietQR của cơ sở (MoMo, ZaloPay, ShopeePay, Viettel Money đều quét được VietQR),
// nên tiền vẫn vào thẳng tài khoản cơ sở và được xác nhận tự động qua webhook (C07).
export const PAY_APPS = [
  {
    id: 'bank',
    group: 'Thanh toán trực tuyến',
    title: 'Quét mã QR / Chuyển khoản',
    hint: 'Ứng dụng ngân hàng bất kỳ',
    steps:
      'Mở ứng dụng ngân hàng → Quét mã QR (hoặc chọn ảnh QR đã tải) → kiểm tra số tiền, nội dung → xác nhận.',
  },
  {
    id: 'momo',
    group: 'Ví điện tử',
    title: 'Ví MoMo',
    hint: 'Quét VietQR bằng MoMo',
    steps:
      'Mở MoMo → bấm “Quét mã” → quét mã QR (hoặc chọn ảnh QR đã tải từ thư viện) → xác nhận chuyển tiền.',
  },
  {
    id: 'zalopay',
    group: 'Ví điện tử',
    title: 'Ví ZaloPay',
    hint: 'Quét VietQR bằng ZaloPay',
    steps: 'Mở ZaloPay → bấm “Quét QR” → quét mã (hoặc chọn ảnh QR đã tải) → xác nhận thanh toán.',
  },
  {
    id: 'shopeepay',
    group: 'Ví điện tử',
    title: 'Ví ShopeePay',
    hint: 'Quét VietQR trong ứng dụng Shopee',
    steps: 'Mở Shopee → ShopeePay → “Quét mã” → quét mã QR (hoặc chọn ảnh QR đã tải) → xác nhận.',
  },
  {
    id: 'viettelmoney',
    group: 'Ví điện tử',
    title: 'Viettel Money',
    hint: 'Quét VietQR bằng Viettel Money',
    steps: 'Mở Viettel Money → “Quét QR” → quét mã (hoặc chọn ảnh QR đã tải) → xác nhận chuyển tiền.',
  },
] as const;

export type PayAppId = (typeof PAY_APPS)[number]['id'];

export function isPayApp(value: string | null | undefined): value is PayAppId {
  return PAY_APPS.some((app) => app.id === value);
}

export function PaymentMethodDialog({
  open,
  amount,
  busy,
  onClose,
  onConfirm,
}: {
  open: boolean;
  amount: number;
  busy: boolean;
  onClose(): void;
  onConfirm(app: PayAppId): void;
}) {
  const [choice, setChoice] = useState<PayAppId>('bank');

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, busy, onClose]);

  if (!open) return null;
  const groups = [...new Set(PAY_APPS.map((app) => app.group))];

  return (
    <div
      className="bg-ink-navy/50 fixed inset-0 z-50 flex items-end justify-center p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-method-title"
    >
      <div className="bg-card border-hairline flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border shadow-xl">
        <div className="border-hairline relative border-b px-5 py-4 text-center">
          <h2 id="pay-method-title" className="text-primary text-lg font-bold">
            Chọn phương thức thanh toán
          </h2>
          <p className="text-slate-gray mt-1 text-sm">
            Số tiền: <strong className="text-ink-navy">{formatMoney(amount)}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Đóng"
            className="text-slate-gray hover:bg-pebble absolute top-3 right-3 flex size-9 items-center justify-center rounded-full"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="space-y-5 overflow-y-auto p-5" role="radiogroup" aria-labelledby="pay-method-title">
          {groups.map((group) => (
            <section key={group} className="space-y-3">
              <h3 className="text-ink-navy text-sm font-bold">{group}</h3>
              {PAY_APPS.filter((app) => app.group === group).map((app) => {
                const selected = choice === app.id;
                const Icon = app.id === 'bank' ? Landmark : Wallet;
                return (
                  <button
                    key={app.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setChoice(app.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition ${
                      selected
                        ? 'border-primary bg-info-bg ring-primary ring-2'
                        : 'border-hairline bg-card hover:bg-pebble'
                    }`}
                  >
                    <Icon className="text-primary size-6 shrink-0" strokeWidth={1.75} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <strong className="text-ink-navy block">{app.title}</strong>
                      <small className="text-slate-gray block">{app.hint}</small>
                    </span>
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                        selected ? 'border-primary bg-primary text-white' : 'border-hairline'
                      }`}
                    >
                      {selected && <Check className="size-3" aria-hidden />}
                    </span>
                  </button>
                );
              })}
            </section>
          ))}
          <p className="text-slate-gray text-xs">
            Tiền chuyển thẳng vào tài khoản của cơ sở khám. Hệ thống tự xác nhận và cấp số thứ tự ngay khi
            nhận được tiền.
          </p>
        </div>

        <div className="border-hairline border-t p-4">
          <Button className="w-full" size="lg" disabled={busy} onClick={() => onConfirm(choice)}>
            {busy && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            Đồng ý
          </Button>
        </div>
      </div>
    </div>
  );
}
