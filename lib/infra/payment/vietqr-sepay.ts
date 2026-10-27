import { AppError } from '@/lib/domain/errors';
import type { CreatePaymentInput, PaymentProvider } from '@/lib/domain/ports';
import type { PaymentRepository } from '@/lib/domain/payment/ports';
import { paymentDeadline } from '@/lib/domain/payment/types';

// C07 mục 2, 5: QR chứa tài khoản của cơ sở nhận tiền, không chứa dữ liệu bệnh nhân.
export class VietQrSepay implements PaymentProvider {
  constructor(
    private readonly facilities: Pick<PaymentRepository, 'facilityById'>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async createPayment(input: CreatePaymentInput) {
    const facility = await this.facilities.facilityById(input.facilityId);
    if (
      !facility ||
      !facility.payOptions.includes('ONLINE') ||
      !facility.bankCode ||
      !facility.bankAccountNo ||
      !facility.bankAccountName ||
      !facility.webhookKeyRef
    )
      throw new AppError('PAYMENT_NOT_CONFIGURED');
    if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new AppError('VALIDATION_FAILED');
    const bank = encodeURIComponent(facility.bankCode);
    const account = encodeURIComponent(facility.bankAccountNo);
    const query = new URLSearchParams({
      amount: String(input.amount),
      addInfo: input.orderCode,
      accountName: facility.bankAccountName,
    });
    return {
      bankCode: facility.bankCode,
      accountNo: facility.bankAccountNo,
      accountName: facility.bankAccountName,
      amount: input.amount,
      content: input.orderCode,
      qrImageUrl: `https://img.vietqr.io/image/${bank}-${account}-compact2.png?${query}`,
      expiresAt: paymentDeadline(this.now()),
    };
  }

  async downloadImage(imageUrl: string): Promise<Uint8Array> {
    const url = new URL(imageUrl);
    if (url.protocol !== 'https:' || url.hostname !== 'img.vietqr.io' || !url.pathname.endsWith('.png'))
      throw new AppError('VALIDATION_FAILED');
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        cache: 'no-store',
        redirect: 'error',
      });
      if (
        !response.ok ||
        !response.headers.get('content-type')?.startsWith('image/png') ||
        Number(response.headers.get('content-length') ?? 0) > 2_000_000
      )
        throw new AppError('PAYMENT_QR_UNAVAILABLE');
      const data = new Uint8Array(await response.arrayBuffer());
      if (data.byteLength > 2_000_000) throw new AppError('PAYMENT_QR_UNAVAILABLE');
      return data;
    } catch {
      throw new AppError('PAYMENT_QR_UNAVAILABLE');
    }
  }
}
