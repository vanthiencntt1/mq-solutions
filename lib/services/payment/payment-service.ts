import { createHash, timingSafeEqual } from 'node:crypto';
import { AppError } from '@/lib/domain/errors';
import type {
  PaymentFacility,
  PaymentHoldStore,
  PaymentQrStore,
  PaymentRecord,
  PaymentRepository,
  RecordTransferResult,
} from '@/lib/domain/payment/ports';
import {
  appointmentCodeSchema,
  codeOfPayosOrder,
  orderCodeIn,
  paymentDeadline,
  payosOrderCodeOf,
  payosWebhookSchema,
  sepayWebhookSchema,
  type PayosWebhook,
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
  /** Cổng PayOS theo cơ sở (không có = chỉ dùng SePay). */
  payos?: PayosGateway;
  /** Trả true nếu được chạy (khóa theo key trong `seconds` giây) – giới hạn số lần hỏi cổng. */
  throttle?(key: string, seconds: number): Promise<boolean>;
}

export interface PayosGateway {
  verify(facility: PaymentFacility, body: PayosWebhook): boolean;
  info(
    facility: PaymentFacility,
    orderCode: number,
  ): Promise<{ status: string; amountPaid: number; reference: string | null }>;
  cancel(facility: PaymentFacility, orderCode: number, reason: string): Promise<void>;
}

interface TransferInput {
  provider: 'SEPAY' | 'PAYOS';
  orderCode: string | null;
  providerTxnId: string;
  bankRef: string | null;
  amount: number;
}

const providerOf = (facility: PaymentFacility | null) => facility?.payProvider ?? 'SEPAY';
// Một link PayOS chỉ thu một lần → mã giao dịch theo mã đơn, webhook và job hỏi lại không ghi trùng.
const payosTxnId = (code: string) => `PAYOS:${code}`;

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
    const facility = await this.d.repo.facilityById(row.facilityId);
    // Trang thanh toán hỏi 3 giây/lần: với PayOS hỏi lại cổng tối đa 10 giây/lần phòng khi webhook chưa tới.
    if (row.paymentStatus === 'PENDING' && facility && providerOf(facility) === 'PAYOS') {
      if (!this.d.throttle || (await this.d.throttle(`payment:payos-sync:${code}`, 10))) {
        if (await this.syncPayos(facility, row)) row = (await this.d.repo.find(code)) ?? row;
      }
    }
    const expiresAt = paymentDeadline(row.createdAt);
    let qr: PaymentQr | null = null;
    if (row.paymentStatus === 'PENDING' && expiresAt > this.d.now()) {
      qr = await this.d.qrStore.get(code);
      if (!qr) {
        qr = await this.d.provider.createPayment({
          facilityId: row.facilityId,
          orderCode: code,
          amount: row.amount,
          expiresAt,
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
            ...(qr.checkoutUrl ? { checkoutUrl: qr.checkoutUrl } : {}),
          }
        : null,
      provider: providerOf(facility),
    };
  }

  async qrImage(accountId: string, code: string): Promise<Uint8Array> {
    const payment = await this.getOrCreate(accountId, code);
    if (!payment.qr) throw new AppError('PAYMENT_NOT_AVAILABLE');
    return this.d.downloadImage(payment.qr.qrImageUrl);
  }

  async handleWebhook(facilityCode: string, authorization: string | null, raw: unknown) {
    const facility = await this.d.repo.facilityByCode(facilityCode);
    if (!facility?.webhookKeyRef || providerOf(facility) !== 'SEPAY')
      throw new AppError('PAYMENT_WEBHOOK_UNAUTHORIZED');
    const presented = authorization?.match(/^Apikey (.+)$/)?.[1] ?? '';
    if (!sameSecret(this.d.secret(facility.webhookKeyRef), presented))
      throw new AppError('PAYMENT_WEBHOOK_UNAUTHORIZED');
    const body = sepayWebhookSchema.parse(raw);
    if (body.transferType === 'out') return { status: 'ignored' as const };
    // C07 mục 5: webhook đúng khóa nhưng chuyển vào số tài khoản khác vẫn phải để kế toán tra soát.
    const orderCode =
      body.accountNumber === facility.bankAccountNo ? orderCodeIn(body.content, body.code) : null;
    const status = await this.acceptTransfer(facility, {
      provider: 'SEPAY',
      orderCode,
      providerTxnId: String(body.id),
      bankRef: body.referenceCode ?? null,
      amount: body.transferAmount,
    });
    return { status };
  }

  // Webhook PayOS: chữ ký HMAC bằng checksum key của cơ sở; chỉ nhận đơn do chính web tạo.
  async handlePayosWebhook(facilityCode: string, raw: unknown) {
    const facility = await this.d.repo.facilityByCode(facilityCode);
    if (!facility?.webhookKeyRef || providerOf(facility) !== 'PAYOS' || !this.d.payos)
      throw new AppError('PAYMENT_WEBHOOK_UNAUTHORIZED');
    const parsed = payosWebhookSchema.safeParse(raw);
    if (!parsed.success || !this.d.payos.verify(facility, parsed.data))
      throw new AppError('PAYMENT_WEBHOOK_UNAUTHORIZED');
    const body = parsed.data;
    if (body.code !== '00' || (body.data.code !== undefined && body.data.code !== '00'))
      return { status: 'ignored' as const };
    const code = codeOfPayosOrder(body.data.orderCode);
    const row = code ? await this.d.repo.find(code) : null;
    // Webhook thử khi đăng ký URL (orderCode 123) hoặc đơn của cơ sở khác: trả 200, không ghi gì.
    if (!code || !row || row.facilityId !== facility.id) return { status: 'ignored' as const };
    const status = await this.acceptTransfer(facility, {
      provider: 'PAYOS',
      orderCode: code,
      providerTxnId: payosTxnId(code),
      bankRef: body.data.reference ?? null,
      amount: body.data.amount,
    });
    return { status };
  }

  // Hỏi PayOS trạng thái đơn (khi lỡ webhook). Trả true nếu vừa ghi nhận được tiền.
  private async syncPayos(facility: PaymentFacility, row: PaymentRecord): Promise<boolean> {
    if (!this.d.payos) return false;
    try {
      const info = await this.d.payos.info(facility, payosOrderCodeOf(row.code));
      if (info.status !== 'PAID') return false;
      const status = await this.acceptTransfer(facility, {
        provider: 'PAYOS',
        orderCode: row.code,
        providerTxnId: payosTxnId(row.code),
        bankRef: info.reference,
        amount: info.amountPaid,
      });
      return status !== 'duplicate';
    } catch {
      return false;
    }
  }

  // Job nền: đơn PayOS còn chờ (từ 1 đến 20 phút tuổi) → hỏi lại cổng.
  async syncPayosDue(): Promise<number> {
    if (!this.d.payos || !this.d.repo.pendingByProvider) return 0;
    const now = this.d.now().getTime();
    const rows = await this.d.repo.pendingByProvider(
      'PAYOS',
      new Date(now - 20 * 60_000),
      new Date(now - 60_000),
      20,
    );
    let paid = 0;
    for (const row of rows) {
      const facility = await this.d.repo.facilityById(row.facilityId);
      if (facility && (await this.syncPayos(facility, row))) paid++;
    }
    return paid;
  }

  // C07 mục 2–4: dùng chung cho mọi cổng – kiểm tra số còn trống, ghi nhận 1 lần, gửi HIS sau commit.
  private async acceptTransfer(
    facility: PaymentFacility,
    t: TransferInput,
  ): Promise<RecordTransferResult['kind']> {
    const row = t.orderCode ? await this.d.repo.find(t.orderCode) : null;
    let slotAvailable = true;
    if (row && row.facilityId === facility.id && t.amount === row.amount && row.bookingApi === 'PAID') {
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
      provider: t.provider,
      orderCode: t.orderCode,
      providerTxnId: t.providerTxnId,
      bankRef: t.bankRef,
      amount: t.amount,
      at: this.d.now(),
      slotAvailable,
    });
    if (result.kind === 'paid') {
      try {
        if (result.bookingApi === 'PAID') await this.d.fulfillPaid(result.code);
        else await this.completeOne(result.code);
      } catch {
        // Giao dịch và outbox đã commit: cổng phải nhận 200, worker sẽ gửi lại HIS.
      }
    }
    return result.kind;
  }

  async expireDue(): Promise<number> {
    const due = await this.d.repo.expireDue(new Date(this.d.now().getTime() - 15 * 60_000), 50);
    let count = 0;
    for (const row of due) {
      if (await this.d.repo.markExpired(row.code, this.d.now())) {
        if (row.bookingApi === 'PAID') await this.d.holds.release(row);
        await this.cancelPayosLink(row);
        count++;
      }
    }
    return count;
  }

  // Hết hạn: khóa link PayOS để khách không trả vào đơn đã nhả số (giảm ca phải hoàn tiền).
  private async cancelPayosLink(row: PaymentRecord) {
    if (!this.d.payos) return;
    try {
      const facility = await this.d.repo.facilityById(row.facilityId);
      if (facility && providerOf(facility) === 'PAYOS')
        await this.d.payos.cancel(facility, payosOrderCodeOf(row.code), 'Hết thời gian giữ chỗ');
    } catch {
      // Link có thể đã tự hết hạn bên PayOS; tiền đến muộn vẫn xử lý theo C07 mục 4.
    }
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
