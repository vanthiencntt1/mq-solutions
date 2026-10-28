import type { CreatePaymentInput, PaymentProvider, PaymentQr } from '@/lib/domain/ports';
import type { PaymentRepository } from '@/lib/domain/payment/ports';
import { AppError } from '@/lib/domain/errors';

// C07 mục 5: mỗi cơ sở chọn cổng riêng (facility.pay_provider); luồng đặt khám không đổi.
export class ProviderRouter implements PaymentProvider {
  constructor(
    private readonly facilities: Pick<PaymentRepository, 'facilityById'>,
    private readonly providers: Record<string, PaymentProvider>,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<PaymentQr> {
    const facility = await this.facilities.facilityById(input.facilityId);
    const provider = this.providers[facility?.payProvider ?? 'SEPAY'];
    if (!provider) throw new AppError('PAYMENT_NOT_CONFIGURED');
    return provider.createPayment(input);
  }
}
