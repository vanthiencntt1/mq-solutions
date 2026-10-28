import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppError } from '@/lib/domain/errors';
import type { CreatePaymentInput, PaymentProvider, PaymentQr } from '@/lib/domain/ports';
import type { PaymentFacility, PaymentRepository } from '@/lib/domain/payment/ports';
import { paymentDeadline, payosOrderCodeOf } from '@/lib/domain/payment/types';

// Cổng PayOS (https://payos.vn/docs/api) cho cơ sở có pay_provider = PAYOS.
// facility.webhook_key_ref là TIỀN TỐ tên biến, ví dụ PAYOS_BVQ7 → PAYOS_BVQ7_CLIENT_ID,
// PAYOS_BVQ7_API_KEY, PAYOS_BVQ7_CHECKSUM_KEY. Không lưu khóa vào DB (C07 mục 5).

const BASE_URL = 'https://api-merchant.payos.vn';

export interface PayosCredentials {
  clientId: string;
  apiKey: string;
  checksumKey: string;
}

export const PAYOS_KEY_SUFFIXES = ['CLIENT_ID', 'API_KEY', 'CHECKSUM_KEY'] as const;

export function payosCredentials(prefix: string, secret: (ref: string) => string): PayosCredentials {
  return {
    clientId: secret(`${prefix}_CLIENT_ID`),
    apiKey: secret(`${prefix}_API_KEY`),
    checksumKey: secret(`${prefix}_CHECKSUM_KEY`),
  };
}

function sortObject(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, value[key]]),
  );
}

// Chuỗi ký theo tài liệu PayOS: key theo alphabet, "key=value" nối bằng "&", null → "".
export function payosSignatureString(data: Record<string, unknown>): string {
  const sorted = sortObject(data);
  return Object.keys(sorted)
    .filter((key) => sorted[key] !== undefined)
    .map((key) => {
      let value = sorted[key];
      if (Array.isArray(value))
        value = JSON.stringify(value.map((v) => sortObject(v as Record<string, unknown>)));
      if (value === null || value === undefined || value === 'null' || value === 'undefined') value = '';
      return `${key}=${String(value)}`;
    })
    .join('&');
}

export function payosSign(data: Record<string, unknown>, checksumKey: string): string {
  return createHmac('sha256', checksumKey).update(payosSignatureString(data)).digest('hex');
}

export function payosVerify(data: Record<string, unknown>, signature: string, checksumKey: string): boolean {
  const expected = Buffer.from(payosSign(data, checksumKey), 'utf8');
  const presented = Buffer.from(signature.toLowerCase(), 'utf8');
  return expected.length === presented.length && timingSafeEqual(expected, presented);
}

type Envelope<T> = { code: string; desc: string; data: T | null };

export type PayosStatus = 'PENDING' | 'PAID' | 'CANCELLED' | 'EXPIRED' | 'PROCESSING' | 'UNDERPAID' | string;

export interface PayosPaymentInfo {
  id: string;
  status: PayosStatus;
  amount: number;
  amountPaid: number;
  transactions: { reference?: string | null; amount?: number }[];
}

interface PayosCreated {
  bin: string;
  accountNumber: string;
  accountName: string;
  description: string;
  checkoutUrl: string;
  paymentLinkId: string;
}

export class PayosApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export class PayosClient {
  constructor(
    private readonly creds: PayosCredentials,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async call<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const response = await this.fetchImpl(`${BASE_URL}${path}`, {
      method,
      headers: {
        'x-client-id': this.creds.clientId,
        'x-api-key': this.creds.apiKey,
        'Content-Type': 'application/json',
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    });
    const json = (await response.json().catch(() => null)) as Envelope<T> | null;
    if (!response.ok || !json || json.code !== '00' || !json.data)
      throw new PayosApiError(json?.code ?? `HTTP_${response.status}`, json?.desc ?? 'PayOS không phản hồi');
    return json.data;
  }

  create(input: {
    orderCode: number;
    amount: number;
    description: string;
    returnUrl: string;
    cancelUrl: string;
    expiredAt: number;
  }): Promise<PayosCreated> {
    const signed = {
      amount: input.amount,
      cancelUrl: input.cancelUrl,
      description: input.description,
      orderCode: input.orderCode,
      returnUrl: input.returnUrl,
    };
    return this.call<PayosCreated>('POST', '/v2/payment-requests', {
      ...signed,
      expiredAt: input.expiredAt,
      signature: payosSign(signed, this.creds.checksumKey),
    });
  }

  info(orderCode: number): Promise<PayosPaymentInfo> {
    return this.call<PayosPaymentInfo>('GET', `/v2/payment-requests/${orderCode}`);
  }

  async cancel(orderCode: number, reason: string): Promise<void> {
    await this.call('POST', `/v2/payment-requests/${orderCode}/cancel`, { cancellationReason: reason });
  }
}

function vietQrImage(bank: string, account: string, amount: number, content: string, name: string) {
  const query = new URLSearchParams({ amount: String(amount), addInfo: content, accountName: name });
  return `https://img.vietqr.io/image/${encodeURIComponent(bank)}-${encodeURIComponent(account)}-compact2.png?${query}`;
}

// C07 mục 2: QR do PayOS cấp cho đúng đơn; vẫn trả về PaymentQr để giao diện dùng chung với SePay.
export class PayosProvider implements PaymentProvider {
  constructor(
    private readonly facilities: Pick<PaymentRepository, 'facilityById'>,
    private readonly client: (facility: PaymentFacility) => PayosClient,
    private readonly appUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<PaymentQr> {
    const facility = await this.facilities.facilityById(input.facilityId);
    if (
      !facility ||
      facility.payProvider !== 'PAYOS' ||
      !facility.payOptions.includes('ONLINE') ||
      !facility.webhookKeyRef
    )
      throw new AppError('PAYMENT_NOT_CONFIGURED');
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new AppError('VALIDATION_FAILED');

    const expiresAt = input.expiresAt ?? paymentDeadline(this.now());
    const orderCode = payosOrderCodeOf(input.orderCode);
    const page = `${this.appUrl.replace(/\/$/, '')}/dat-kham/thanh-toan?code=${encodeURIComponent(input.orderCode)}`;
    const api = this.client(facility);
    try {
      const link = await api.create({
        orderCode,
        amount: input.amount,
        description: input.orderCode, // 12 ký tự, khớp mẫu nhận diện mã phiếu
        returnUrl: page,
        cancelUrl: page,
        expiredAt: Math.floor(expiresAt.getTime() / 1000),
      });
      return {
        bankCode: link.bin,
        accountNo: link.accountNumber,
        accountName: link.accountName,
        amount: input.amount,
        content: link.description,
        qrImageUrl: vietQrImage(
          link.bin,
          link.accountNumber,
          input.amount,
          link.description,
          link.accountName,
        ),
        checkoutUrl: link.checkoutUrl,
        expiresAt,
      };
    } catch (error) {
      // Link đã tạo trước đó (mất cache QR): dùng lại trang thanh toán PayOS của link cũ.
      if (error instanceof PayosApiError && error.code === '231') {
        const info = await api.info(orderCode).catch(() => null);
        if (
          info &&
          info.status === 'PENDING' &&
          facility.bankCode &&
          facility.bankAccountNo &&
          facility.bankAccountName
        )
          return {
            bankCode: facility.bankCode,
            accountNo: facility.bankAccountNo,
            accountName: facility.bankAccountName,
            amount: input.amount,
            content: input.orderCode,
            qrImageUrl: vietQrImage(
              facility.bankCode,
              facility.bankAccountNo,
              input.amount,
              input.orderCode,
              facility.bankAccountName,
            ),
            checkoutUrl: `https://pay.payos.vn/web/${encodeURIComponent(info.id)}`,
            expiresAt,
          };
      }
      throw new AppError('PAYMENT_QR_UNAVAILABLE');
    }
  }
}

// Gateway cho PaymentService: chọn đúng bộ khóa của cơ sở theo tiền tố webhook_key_ref.
export function payosGateway(secret: (ref: string) => string) {
  const clientFor = (facility: PaymentFacility) => {
    if (!facility.webhookKeyRef) throw new AppError('PAYMENT_NOT_CONFIGURED');
    return new PayosClient(payosCredentials(facility.webhookKeyRef, secret));
  };
  return {
    clientFor,
    verify(facility: PaymentFacility, body: { data: Record<string, unknown>; signature: string }) {
      if (!facility.webhookKeyRef) return false;
      return payosVerify(body.data, body.signature, secret(`${facility.webhookKeyRef}_CHECKSUM_KEY`));
    },
    async info(facility: PaymentFacility, orderCode: number) {
      const info = await clientFor(facility).info(orderCode);
      return {
        status: info.status,
        amountPaid: Number(info.amountPaid ?? 0),
        reference: info.transactions?.[0]?.reference ?? null,
      };
    },
    cancel: (facility: PaymentFacility, orderCode: number, reason: string) =>
      clientFor(facility).cancel(orderCode, reason),
  };
}
