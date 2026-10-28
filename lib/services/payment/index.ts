import { getEnv, getSecretByRef } from '@/lib/config/env';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import { prismaBookingAccount, prismaBookingRepository } from '@/lib/infra/db/booking-repository';
import { prismaPaymentRepository } from '@/lib/infra/db/payment-repository';
import { hisClient } from '@/lib/infra/his';
import { redisPaymentHolds } from '@/lib/infra/payment/payment-holds';
import { redisPaymentQrStore } from '@/lib/infra/payment/payment-qr-store';
import { VietQrSepay } from '@/lib/infra/payment/vietqr-sepay';
import { PayosProvider, payosGateway } from '@/lib/infra/payment/payos';
import { ProviderRouter } from '@/lib/infra/payment/provider-router';
import { getRedis } from '@/lib/infra/redis/client';
import { getBookingService } from '@/lib/services/booking';
import { getCatalogService } from '@/lib/services/catalog';
import { getIdentityService } from '@/lib/services/identity';
import { completeUnpaidBooking } from './complete-unpaid';
import { PaymentService } from './payment-service';

let instance: PaymentService | undefined;

export function getPaymentService(): PaymentService {
  if (!instance) {
    const env = getEnv();
    const catalog = getCatalogService();
    const sepay = new VietQrSepay(prismaPaymentRepository);
    const payos = payosGateway(getSecretByRef);
    // C07 mục 5: mỗi cơ sở một cổng (facility.pay_provider), luồng đặt khám dùng chung.
    const provider = new ProviderRouter(prismaPaymentRepository, {
      SEPAY: sepay,
      PAYOS: new PayosProvider(prismaPaymentRepository, payos.clientFor, env.APP_URL),
    });
    instance = new PaymentService({
      repo: prismaPaymentRepository,
      provider,
      payos,
      throttle: async (key, seconds) => (await getRedis().set(key, '1', 'EX', seconds, 'NX')) === 'OK',
      downloadImage: (url) => sepay.downloadImage(url),
      holds: redisPaymentHolds,
      qrStore: redisPaymentQrStore,
      fulfillPaid: (code) => getBookingService().fulfillPaid(code),
      completeUnpaid: completeUnpaidBooking({
        booking: prismaBookingRepository,
        accounts: prismaBookingAccount(piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET)),
        identity: getIdentityService(),
        catalog,
        his: hisClient,
      }),
      isNumberUsed: (row) =>
        catalog.isBookingNumberUsed(row.facilityCode, row.roomHisId, row.examDate, row.bookingNumber),
      secret: getSecretByRef,
      now: () => new Date(),
    });
  }
  return instance;
}

export { PaymentService } from './payment-service';
