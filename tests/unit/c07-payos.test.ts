import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { PaymentFacility, PaymentRecord, PaymentRepository } from '@/lib/domain/payment/ports';
import { codeOfPayosOrder, payosOrderCodeOf } from '@/lib/domain/payment/types';
import { PayosClient, PayosProvider, payosSign, payosVerify } from '@/lib/infra/payment/payos';
import { PaymentService, type PayosGateway } from '@/lib/services/payment/payment-service';

const code = 'MQABCDEF1234';
const now = new Date('2026-10-28T03:00:00.000Z');
const facility: PaymentFacility = {
  id: 'facility-a',
  code: 'BVA',
  payOptions: ['ONLINE', 'AT_FACILITY'],
  payProvider: 'PAYOS',
  bankCode: 'MB',
  bankAccountNo: '0123456789',
  bankAccountName: 'BENH VIEN A',
  webhookKeyRef: 'PAYOS_BVA',
};
const row: PaymentRecord = {
  id: 'payment-a',
  code,
  accountId: 'account-a',
  facilityId: facility.id,
  facilityCode: facility.code,
  facilityName: 'Bệnh viện A',
  roomHisId: 101,
  examDate: '2026-10-29',
  bookingNumber: 7,
  bookingApi: 'PAID',
  payMethod: 'ONLINE',
  appointmentStatus: 'CHO_THANH_TOAN',
  paymentStatus: 'PENDING',
  amount: 200000,
  createdAt: new Date(now.getTime() - 2 * 60_000),
  providerTxnId: null,
  hisBookingId: null,
};
const checksumKey = 'checksum-bva';

function webhook(orderCode: number, amount: number, key = checksumKey) {
  const data = {
    orderCode,
    amount,
    description: code,
    accountNumber: '0123456789',
    reference: 'FT26102800001',
    transactionDateTime: '2026-10-28 10:00:00',
    currency: 'VND',
    paymentLinkId: 'link-1',
    code: '00',
    desc: 'success',
    counterAccountName: null,
  };
  return { code: '00', desc: 'success', success: true, data, signature: payosSign(data, key) };
}

function harness(opts: { facility?: PaymentFacility; payment?: PaymentRecord; throttle?: boolean } = {}) {
  const f = opts.facility ?? facility;
  const payment = opts.payment ?? row;
  const record = vi
    .fn<PaymentRepository['record']>()
    .mockResolvedValue({ kind: 'paid', code, bookingApi: 'PAID' });
  const repo: PaymentRepository = {
    facilityByCode: vi.fn().mockResolvedValue(f),
    facilityById: vi.fn().mockResolvedValue(f),
    find: vi.fn().mockResolvedValue(payment),
    createForUnpaid: vi.fn().mockResolvedValue(payment),
    record,
    expireDue: vi.fn().mockResolvedValue([payment]),
    markExpired: vi.fn().mockResolvedValue(true),
    completePaymentDue: vi.fn().mockResolvedValue([]),
    completePaymentOutbox: vi.fn().mockResolvedValue(null),
    completePaymentDone: vi.fn().mockResolvedValue(undefined),
    completePaymentFailed: vi.fn().mockResolvedValue(undefined),
    pendingByProvider: vi.fn().mockResolvedValue([payment]),
  };
  const payos: PayosGateway = {
    verify: (_f, body) => payosVerify(body.data, body.signature, checksumKey),
    info: vi.fn().mockResolvedValue({ status: 'PENDING', amountPaid: 0, reference: null }),
    cancel: vi.fn().mockResolvedValue(undefined),
  };
  const fulfillPaid = vi.fn().mockResolvedValue(undefined);
  const createPayment = vi.fn().mockResolvedValue({
    bankCode: '970422',
    accountNo: 'VA123',
    accountName: 'BENH VIEN A',
    amount: payment.amount,
    content: code,
    qrImageUrl: 'https://img.vietqr.io/image/970422-VA123-compact2.png',
    checkoutUrl: 'https://pay.payos.vn/web/link-1',
    expiresAt: new Date(now.getTime() + 13 * 60_000),
  });
  const service = new PaymentService({
    repo,
    provider: { createPayment },
    downloadImage: vi.fn(),
    holds: { slotAvailable: vi.fn().mockResolvedValue(true), release: vi.fn().mockResolvedValue(undefined) },
    qrStore: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
    fulfillPaid,
    completeUnpaid: vi.fn(),
    isNumberUsed: vi.fn().mockResolvedValue(false),
    secret: () => 'unused',
    now: () => now,
    payos,
    throttle: vi.fn().mockResolvedValue(opts.throttle ?? true),
  });
  return { service, repo, record, payos, fulfillPaid, createPayment };
}

describe('PayOS – chữ ký và mã đơn', () => {
  it('khớp ví dụ chữ ký trong tài liệu PayOS', () => {
    const data = {
      orderCode: 123,
      amount: 3000,
      description: 'VQRIO123',
      accountNumber: '12345678',
      reference: 'TF230204212323',
      transactionDateTime: '2023-02-04 18:25:00',
      currency: 'VND',
      paymentLinkId: '124c33293c43417ab7879e14c8d9eb18',
      code: '00',
      desc: 'Thành công',
      counterAccountBankId: '',
      counterAccountBankName: '',
      counterAccountName: '',
      counterAccountNumber: '',
      virtualAccountName: '',
      virtualAccountNumber: '',
    };
    const key = '1a54716c8f0efb2744fb28b6e38b25da7f67a925d98bc1c18bd8faaecadd7675';
    expect(payosVerify(data, '412e915d2871504ed31be63c8f62a149a4410d34c4c42affc9006ef9917eaa03', key)).toBe(
      true,
    );
    expect(payosVerify({ ...data, amount: 1 }, payosSign(data, key), key)).toBe(false);
  });

  it('đổi mã phiếu ↔ orderCode số, hai chiều', () => {
    const n = payosOrderCodeOf(code);
    expect(Number.isSafeInteger(n)).toBe(true);
    expect(codeOfPayosOrder(n)).toBe(code);
    expect(codeOfPayosOrder(payosOrderCodeOf('MQ0000000001'))).toBe('MQ0000000001');
    expect(codeOfPayosOrder(2 ** 41)).toBeNull();
    expect(codeOfPayosOrder(-1)).toBeNull();
  });
});

describe('PayOS – webhook', () => {
  it('ghi nhận tiền một lần với mã giao dịch theo đơn và gửi HIS', async () => {
    const h = harness();
    await expect(
      h.service.handlePayosWebhook('BVA', webhook(payosOrderCodeOf(code), 200000)),
    ).resolves.toEqual({
      status: 'paid',
    });
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'PAYOS',
        orderCode: code,
        providerTxnId: `PAYOS:${code}`,
        bankRef: 'FT26102800001',
        amount: 200000,
      }),
    );
    expect(h.fulfillPaid).toHaveBeenCalledWith(code);
  });

  it('sai chữ ký → 401, không ghi nhận', async () => {
    const h = harness();
    await expect(
      h.service.handlePayosWebhook('BVA', webhook(payosOrderCodeOf(code), 200000, 'wrong')),
    ).rejects.toMatchObject({ code: 'PAYMENT_WEBHOOK_UNAUTHORIZED' });
    expect(h.record).not.toHaveBeenCalled();
  });

  it('cơ sở dùng SePay không nhận webhook PayOS và ngược lại', async () => {
    const sepayFacility = { ...facility, payProvider: 'SEPAY' };
    const h = harness({ facility: sepayFacility });
    await expect(
      h.service.handlePayosWebhook('BVA', webhook(payosOrderCodeOf(code), 200000)),
    ).rejects.toBeInstanceOf(AppError);
    const p = harness();
    await expect(p.service.handleWebhook('BVA', 'Apikey unused', {})).rejects.toMatchObject({
      code: 'PAYMENT_WEBHOOK_UNAUTHORIZED',
    });
  });

  it('webhook thử khi đăng ký URL (orderCode lạ) → bỏ qua, không tạo giao dịch lạc', async () => {
    const h = harness();
    (h.repo.find as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(h.service.handlePayosWebhook('BVA', webhook(123, 3000))).resolves.toEqual({
      status: 'ignored',
    });
    expect(h.record).not.toHaveBeenCalled();
  });
});

describe('PayOS – hỏi lại khi lỡ webhook và hết hạn', () => {
  it('trang thanh toán hỏi PayOS; đã PAID thì ghi nhận cùng mã giao dịch với webhook', async () => {
    const h = harness();
    (h.payos.info as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'PAID',
      amountPaid: 200000,
      reference: 'FT1',
    });
    const view = await h.service.getOrCreate('account-a', code);
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'PAYOS', providerTxnId: `PAYOS:${code}`, amount: 200000 }),
    );
    expect(view.provider).toBe('PAYOS');
  });

  it('bị giới hạn tần suất thì không gọi PayOS; trả kèm link trang thanh toán', async () => {
    const h = harness({ throttle: false });
    const view = await h.service.getOrCreate('account-a', code);
    expect(h.payos.info).not.toHaveBeenCalled();
    expect(view.qr?.checkoutUrl).toBe('https://pay.payos.vn/web/link-1');
    expect(h.createPayment).toHaveBeenCalledWith(expect.objectContaining({ expiresAt: expect.any(Date) }));
  });

  it('job nền bắt được giao dịch đã trả', async () => {
    const h = harness();
    (h.payos.info as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: 'PAID',
      amountPaid: 200000,
      reference: null,
    });
    await expect(h.service.syncPayosDue()).resolves.toBe(1);
  });

  it('hết hạn giữ chỗ → hủy link PayOS', async () => {
    const h = harness({ payment: { ...row, createdAt: new Date(now.getTime() - 16 * 60_000) } });
    await h.service.expireDue();
    expect(h.payos.cancel).toHaveBeenCalledWith(facility, payosOrderCodeOf(code), expect.any(String));
  });
});

describe('PayOS – tạo link', () => {
  it('gửi đúng chữ ký, hạn link và trả QR + trang thanh toán', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: '00',
          desc: 'success',
          data: {
            bin: '970422',
            accountNumber: 'VA123',
            accountName: 'BENH VIEN A',
            description: code,
            checkoutUrl: 'https://pay.payos.vn/web/link-1',
            paymentLinkId: 'link-1',
          },
        }),
        { status: 200 },
      ),
    );
    const client = new PayosClient({ clientId: 'c', apiKey: 'a', checksumKey }, fetchMock);
    const provider = new PayosProvider(
      { facilityById: async () => facility },
      () => client,
      'https://mq.vn',
      () => now,
    );
    const expiresAt = new Date(now.getTime() + 15 * 60_000);
    const qr = await provider.createPayment({
      facilityId: facility.id,
      orderCode: code,
      amount: 200000,
      expiresAt,
    });
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body.orderCode).toBe(payosOrderCodeOf(code));
    expect(body.description).toBe(code);
    expect(body.expiredAt).toBe(Math.floor(expiresAt.getTime() / 1000));
    const { signature, ...rest } = body;
    expect(signature).toBe(
      payosSign(
        {
          amount: rest.amount,
          cancelUrl: rest.cancelUrl,
          description: rest.description,
          orderCode: rest.orderCode,
          returnUrl: rest.returnUrl,
        },
        checksumKey,
      ),
    );
    expect(qr.checkoutUrl).toBe('https://pay.payos.vn/web/link-1');
    expect(qr.qrImageUrl).toContain('img.vietqr.io/image/970422-VA123');
  });

  it('cơ sở không dùng PayOS → chưa cấu hình', async () => {
    const provider = new PayosProvider(
      { facilityById: async () => ({ ...facility, payProvider: 'SEPAY' }) },
      () => {
        throw new Error('không được gọi');
      },
      'https://mq.vn',
    );
    await expect(
      provider.createPayment({ facilityId: 'x', orderCode: code, amount: 1000 }),
    ).rejects.toMatchObject({
      code: 'PAYMENT_NOT_CONFIGURED',
    });
  });
});
