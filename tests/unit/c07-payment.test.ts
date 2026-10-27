import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { PaymentFacility, PaymentRecord, PaymentRepository } from '@/lib/domain/payment/ports';
import { classifyTransfer, orderCodeIn, paymentDeadline } from '@/lib/domain/payment/types';
import { VietQrSepay } from '@/lib/infra/payment/vietqr-sepay';
import { PaymentService } from '@/lib/services/payment/payment-service';

const code = 'MQABCDEF1234';
const now = new Date('2026-10-27T03:00:00.000Z');
const facility: PaymentFacility = {
  id: 'facility-a',
  code: 'BVA',
  payOptions: ['ONLINE', 'AT_FACILITY'],
  bankCode: 'VCB',
  bankAccountNo: '0123456789',
  bankAccountName: 'BENH VIEN A',
  webhookKeyRef: 'SEPAY_WEBHOOK_KEY_BVA',
};
const row: PaymentRecord = {
  id: 'payment-a',
  code,
  accountId: 'account-a',
  facilityId: facility.id,
  facilityCode: facility.code,
  facilityName: 'Bệnh viện A',
  roomHisId: 101,
  examDate: '2026-10-28',
  bookingNumber: 7,
  bookingApi: 'PAID',
  payMethod: 'ONLINE',
  appointmentStatus: 'CHO_THANH_TOAN',
  paymentStatus: 'PENDING',
  amount: 200000,
  createdAt: now,
  providerTxnId: null,
  hisBookingId: null,
};

function harness(payment: PaymentRecord = row) {
  const record = vi
    .fn<PaymentRepository['record']>()
    .mockResolvedValue({ kind: 'paid', code, bookingApi: 'PAID' });
  const markExpired = vi.fn<PaymentRepository['markExpired']>().mockResolvedValue(true);
  const release = vi.fn().mockResolvedValue(undefined);
  const slotAvailable = vi.fn().mockResolvedValue(true);
  const isNumberUsed = vi.fn().mockResolvedValue(false);
  const fulfillPaid = vi.fn().mockResolvedValue(undefined);
  const completeUnpaid = vi.fn().mockResolvedValue(undefined);
  const repo: PaymentRepository = {
    facilityByCode: vi.fn().mockResolvedValue(facility),
    facilityById: vi.fn().mockResolvedValue(facility),
    find: vi.fn().mockResolvedValue(payment),
    createForUnpaid: vi.fn().mockResolvedValue(payment),
    record,
    expireDue: vi.fn().mockResolvedValue([payment]),
    markExpired,
    completePaymentDue: vi.fn().mockResolvedValue([]),
    completePaymentOutbox: vi.fn().mockResolvedValue(null),
    completePaymentDone: vi.fn().mockResolvedValue(undefined),
    completePaymentFailed: vi.fn().mockResolvedValue(undefined),
  };
  const service = new PaymentService({
    repo,
    provider: new VietQrSepay(repo, () => now),
    downloadImage: vi.fn().mockResolvedValue(new Uint8Array()),
    holds: { slotAvailable, release },
    qrStore: { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) },
    fulfillPaid,
    completeUnpaid,
    isNumberUsed,
    secret: () => 'local-secret',
    now: () => now,
  });
  return {
    service,
    repo,
    record,
    release,
    slotAvailable,
    isNumberUsed,
    fulfillPaid,
    completeUnpaid,
    markExpired,
  };
}

const webhook = (amount = 200000) => ({
  id: 92704,
  accountNumber: facility.bankAccountNo!,
  content: `Thanh toan ${code}`,
  code,
  transferType: 'in',
  transferAmount: amount,
  referenceCode: 'FT123',
});

describe('C07 payment', () => {
  it('chỉ nhận đúng số tiền nguyên VND; tiền muộn hết số cần hoàn', () => {
    expect(classifyTransfer(200000, 200000, true)).toBe('paid');
    expect(classifyTransfer(200000, 199999, true)).toBe('mismatch');
    expect(classifyTransfer(200000, 200001, true)).toBe('mismatch');
    expect(classifyTransfer(200000, 200000, false)).toBe('refund');
    expect(paymentDeadline(now).toISOString()).toBe('2026-10-27T03:15:00.000Z');
  });

  it('chỉ tách mã đơn độc lập trong nội dung chuyển khoản', () => {
    expect(orderCodeIn(`IBFT ${code} thanh toan`)).toBe(code);
    expect(orderCodeIn(`X${code}Y`)).toBeNull();
  });

  it('sai khóa webhook trả 401 và không ghi giao dịch', async () => {
    const h = harness();
    await expect(h.service.handleWebhook('BVA', 'Apikey wrong', webhook())).rejects.toMatchObject({
      code: 'PAYMENT_WEBHOOK_UNAUTHORIZED',
      status: 401,
    } satisfies Partial<AppError>);
    expect(h.record).not.toHaveBeenCalled();
  });

  it('giao dịch trùng không gọi HIS lần nữa', async () => {
    const h = harness();
    h.record.mockResolvedValue({ kind: 'duplicate' });
    await expect(h.service.handleWebhook('BVA', 'Apikey local-secret', webhook())).resolves.toEqual({
      status: 'duplicate',
    });
    expect(h.fulfillPaid).not.toHaveBeenCalled();
  });

  it('thiếu tiền được giữ để kế toán xử lý và không gọi HIS', async () => {
    const h = harness();
    h.record.mockResolvedValue({ kind: 'mismatch' });
    await expect(h.service.handleWebhook('BVA', 'Apikey local-secret', webhook(199999))).resolves.toEqual({
      status: 'mismatch',
    });
    expect(h.fulfillPaid).not.toHaveBeenCalled();
  });

  it('chỉ gọi HIS sau khi repository đã ghi tiền hợp lệ', async () => {
    const h = harness();
    await expect(h.service.handleWebhook('BVA', 'Apikey local-secret', webhook())).resolves.toEqual({
      status: 'paid',
    });
    expect(h.record).toHaveBeenCalledWith(
      expect.objectContaining({ facilityId: facility.id, amount: 200000, orderCode: code }),
    );
    expect(h.fulfillPaid).toHaveBeenCalledOnce();
  });

  it('số tài khoản webhook sai được ghi như giao dịch chưa khớp', async () => {
    const h = harness();
    h.record.mockResolvedValue({ kind: 'unmatched' });
    await h.service.handleWebhook('BVA', 'Apikey local-secret', { ...webhook(), accountNumber: '999' });
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ orderCode: null }));
    expect(h.fulfillPaid).not.toHaveBeenCalled();
  });

  it('hết hạn đổi trạng thái rồi nhả đúng khóa giữ chỗ', async () => {
    const h = harness();
    expect(await h.service.expireDue()).toBe(1);
    expect(h.markExpired).toHaveBeenCalledWith(code, now);
    expect(h.release).toHaveBeenCalledWith(row);
  });

  it('tiền đến muộn chỉ nhận khi HIS xác nhận số còn trống', async () => {
    const late = { ...row, createdAt: new Date(now.getTime() - 16 * 60_000), appointmentStatus: 'QUA_HAN' };
    const h = harness(late);
    h.isNumberUsed.mockResolvedValue(true);
    h.record.mockResolvedValue({ kind: 'refund' });
    await h.service.handleWebhook('BVA', 'Apikey local-secret', webhook());
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ slotAvailable: false }));
    expect(h.slotAvailable).not.toHaveBeenCalled();
    expect(h.fulfillPaid).not.toHaveBeenCalled();
  });

  it('không kiểm tra được số giữ chỗ thì ghi nhận để hoàn tiền, không gọi HIS', async () => {
    const h = harness();
    h.slotAvailable.mockRejectedValue(new Error('Redis unavailable'));
    h.record.mockResolvedValue({ kind: 'refund' });
    await h.service.handleWebhook('BVA', 'Apikey local-secret', webhook());
    expect(h.record).toHaveBeenCalledWith(expect.objectContaining({ slotAvailable: false }));
    expect(h.fulfillPaid).not.toHaveBeenCalled();
  });

  it('phiếu đã đặt tại viện gọi CompletePayment và kết thúc outbox một lần', async () => {
    const h = harness({
      ...row,
      bookingApi: 'UNPAID',
      payMethod: 'AT_FACILITY',
      appointmentStatus: 'DA_CO_STT',
    });
    h.record.mockResolvedValue({ kind: 'paid', code, bookingApi: 'UNPAID' });
    vi.mocked(h.repo.completePaymentOutbox).mockResolvedValue({ id: 'outbox-a', code, attempts: 0 });
    await h.service.handleWebhook('BVA', 'Apikey local-secret', webhook());
    expect(h.completeUnpaid).toHaveBeenCalledExactlyOnceWith(code);
    expect(h.repo.completePaymentDone).toHaveBeenCalledExactlyOnceWith('outbox-a', code);
    expect(h.fulfillPaid).not.toHaveBeenCalled();
  });

  it('HIS lỗi sau khi nhận tiền vẫn trả webhook thành công và giữ outbox để thử lại', async () => {
    const h = harness({
      ...row,
      bookingApi: 'UNPAID',
      payMethod: 'AT_FACILITY',
      appointmentStatus: 'DA_CO_STT',
    });
    h.record.mockResolvedValue({ kind: 'paid', code, bookingApi: 'UNPAID' });
    vi.mocked(h.repo.completePaymentOutbox).mockResolvedValue({ id: 'outbox-a', code, attempts: 0 });
    h.completeUnpaid.mockRejectedValue(new AppError('HIS_UNAVAILABLE'));
    await expect(h.service.handleWebhook('BVA', 'Apikey local-secret', webhook())).resolves.toEqual({
      status: 'paid',
    });
    expect(h.repo.completePaymentFailed).toHaveBeenCalledWith('outbox-a', code, 1, 'HIS_UNAVAILABLE');
    expect(h.repo.completePaymentDone).not.toHaveBeenCalled();
  });

  it('QR lấy đúng tài khoản của từng cơ sở và nội dung là mã đơn', async () => {
    const h = harness();
    const provider = new VietQrSepay(h.repo, () => now);
    const qrA = await provider.createPayment({ facilityId: facility.id, orderCode: code, amount: 200000 });
    expect(qrA.accountNo).toBe('0123456789');
    expect(qrA.content).toBe(code);
    expect(qrA.qrImageUrl).toContain('VCB-0123456789-compact2.png');
    vi.mocked(h.repo.facilityById).mockResolvedValue({
      ...facility,
      id: 'facility-b',
      bankCode: 'BIDV',
      bankAccountNo: '9876543210',
    });
    const qrB = await provider.createPayment({ facilityId: 'facility-b', orderCode: code, amount: 200000 });
    expect(qrB.accountNo).toBe('9876543210');
  });
});
