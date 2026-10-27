import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '@/lib/domain/errors';
import type { PaymentHoldStore, PaymentQrStore, PaymentRepository } from '@/lib/domain/payment/ports';
import {
  appointmentCodeSchema,
  orderCodeIn,
  paymentDeadline,
  sepayWebhookSchema,
  type PaymentView,
} from '@/lib/domain/payment/types';
import type { PaymentProvider, PaymentQr } from '@/lib/domain/ports';

interface PaymentDeps {
  repo: PaymentRepository;
  provider: PaymentProvider;
  downloadImage(url: string): Promise<Uint8Array>;
  holds: PaymentHoldStore;
  qrStore: PaymentQrStore;
  fulfillPaid(code: string): Promise<unknown>;
  completeUnpaid(code: string): Promise<void>;
  isNumberUsed(row: {
    facilityCode: string;
    roomHisId: number;
    examDate: string;
    bookingNumber: number;
  }): Promise<boolean>;
  secret(ref: string): string;
  now(): Date;
}

function sameSecret(expected: string, presented: string): boolean {
  const a = createHash('sha256').update(expected).digest();
  const b = createHash('sha256').update(presented).digest();
  return timingSafeEqual(a, b);
}

// C07 mục 2–4: idempotency giao dịch nằm ở repository; service chỉ điều phối HIS sau commit.
export class PaymentService {
  constructor(private readonly d: PaymentDeps) {}

  async getOrCreate(accountId: string, rawCode: string): Promise<PaymentView> {
    const code = appointmentCodeSchema.parse(rawCode);
    let row = await this.d.repo.find(code);
    if (!row) row = await this.d.repo.createForUnpaid(code, accountId, this.d.now());
    if (row.accountId !== accountId) throw new AppError('NOT_FOUND');
    const expiresAt = paymentDeadline(row.createdAt);
    let qr: PaymentQr | null = null;
    if (row.paymentStatus === 'PENDING' && expiresAt > this.d.now()) {
      qr = await this.d.qrStore.get(code);
      if (!qr) {
        qr = await this.d.provider.createPayment({
          facilityId: row.facilityId,
          orderCode: code,
          amount: row.amount,
        });
        qr.expiresAt = expiresAt;
        await this.d.qrStore.set(code, qr);
      }
    }
    return {
      code,
      facilityName: row.facilityName,
      amount: row.amount,
      paymentStatus: row.paymentStatus,
      appointmentStatus: row.appointmentStatus,
      expiresAt: expiresAt.toISOString(),
      qr: qr
        ? {
            bankCode: qr.bankCode,
            accountNo: qr.accountNo,
            accountName: qr.accountName,
            amount: qr.amount,
            content: qr.content,
            qrImageUrl: qr.qrImageUrl,
          }
        : null,
    };
  }

  async qrImage(accountId: string, code: string): Promise<Uint8Array> {
    const payment = await this.getOrCreate(accountId, code);
    if (!payment.qr) throw new AppError('PAYMENT_NOT_AVAILABLE');
    return this.d.downloadImage(payment.qr.qrImageUrl);
  }

  async handleWebhook(facilityCode: string, authorization: string | null, raw: unknown) {
    const facility = await this.d.repo.facilityByCode(facilityCode);
    if (!facility?.webhookKeyRef) throw new AppError('PAYMENT_WEBHOOK_UNAUTHORIZED');
    const presented = authorization?.match(/^Apikey (.+)$/)?.[1] ?? '';
    if (!sameSecret(this.d.secret(facility.webhookKeyRef), presented))
      throw new AppError('PAYMENT_WEBHOOK_UNAUTHORIZED');
    const body = sepayWebhookSchema.parse(raw);
    if (body.transferType === 'out') return { status: 'ignored' as const };
    // C07 mục 5: webhook đúng khóa nhưng chuyển vào số tài khoản khác vẫn phải để kế toán tra soát.
    const orderCode =
      body.accountNumber === facility.bankAccountNo ? orderCodeIn(body.content, body.code) : null;
    const row = orderCode ? await this.d.repo.find(orderCode) : null;
    let slotAvailable = true;
    if (
      row &&
      row.facilityId === facility.id &&
      body.transferAmount === row.amount &&
      row.bookingApi === 'PAID'
    ) {
      try {
        const late = this.d.now() >= paymentDeadline(row.createdAt) || row.appointmentStatus === 'QUA_HAN';
        if (late && (await this.d.isNumberUsed(row))) slotAvailable = false;
        if (slotAvailable) slotAvailable = await this.d.holds.slotAvailable(row);
      } catch {
        // C07 mục 4: khi không xác minh được số, ghi tiền để kế toán hoàn thay vì thử đặt lịch trùng.
        slotAvailable = false;
      }
    }
    const result = await this.d.repo.record({
      facilityId: facility.id,
      orderCode,
      providerTxnId: String(body.id),
      bankRef: body.referenceCode ?? null,
      amount: body.transferAmount,
      at: this.d.now(),
      slotAvailable,
    });
    if (result.kind === 'paid') {
      try {
        if (result.bookingApi === 'PAID') await this.d.fulfillPaid(result.code);
        else await this.completeOne(result.code);
      } catch {
        // Giao dịch và outbox đã commit: SePay phải nhận 200, worker sẽ gửi lại HIS.
      }
    }
    return { status: result.kind };
  }

  async expireDue(): Promise<number> {
    const due = await this.d.repo.expireDue(new Date(this.d.now().getTime() - 15 * 60_000), 50);
    let count = 0;
    for (const row of due) {
      if (await this.d.repo.markExpired(row.code, this.d.now())) {
        if (row.bookingApi === 'PAID') await this.d.holds.release(row);
        count++;
      }
    }
    return count;
  }

  async retryCompleteDue(): Promise<void> {
    const due = await this.d.repo.completePaymentDue(this.d.now(), 20);
    for (const item of due) await this.completeOne(item.code, item);
  }

  private async completeOne(code: string, item?: { id: string; attempts: number }) {
    const outbox = item ?? (await this.d.repo.completePaymentOutbox(code));
    if (!outbox) return;
    try {
      await this.d.completeUnpaid(code);
      await this.d.repo.completePaymentDone(outbox.id, code);
    } catch (error) {
      const codeError = error instanceof AppError ? error.code : 'HIS_ERROR';
      await this.d.repo.completePaymentFailed(outbox.id, code, outbox.attempts + 1, codeError);
    }
  }
}
