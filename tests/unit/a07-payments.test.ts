import { describe, expect, it } from 'vitest';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { AdminPaymentsService } from '@/lib/services/admin-payments/admin-payments-service';
import type { PaymentRepository, PaymentRow } from '@/lib/services/admin-payments/types';

const manager: AdminPrincipal = {
  id: 'manager-a',
  name: 'Kế toán A',
  role: 'FACILITY_MANAGER',
  facilityIds: ['facility-a'],
  permissions: ['payment:read', 'refund:create'],
};
const approver: AdminPrincipal = {
  ...manager,
  id: 'approver-a',
  permissions: ['payment:read', 'refund:approve'],
};
const row: PaymentRow = {
  id: 'payment-1',
  facilityId: 'facility-a',
  facilityName: 'Cơ sở A',
  orderCode: 'MQ123456',
  providerTxnId: 'TXN-1',
  amount: 2_200_000,
  paidAmount: 2_200_000,
  status: 'PAID',
  appointmentCode: 'MQ123456',
  appointmentStatus: 'CHO_HOAN_TIEN',
  refundBy: null,
  refundApprovedBy: null,
  refundRef: null,
  createdAt: new Date(),
  paidAt: new Date(),
  refundedAt: null,
};

function fake(initial: PaymentRow = row) {
  let current = { ...initial };
  let request: { amount: number; note: string } | null = null;
  const calls: string[] = [];
  const repo: PaymentRepository = {
    list: async () => ({ rows: [current], total: 1 }),
    facilities: async () => [{ id: 'facility-a', name: 'A' }],
    find: async (_id, scope) => (scope?.includes(current.facilityId) === false ? null : current),
    refundEmail: async () => 'benhnhan@example.test',
    match: async () => {
      calls.push('match');
      return current;
    },
    requestRefund: async (_id, amount, note, actorId) => {
      calls.push('request');
      request = { amount, note };
      current = { ...current, status: 'REFUND_PENDING', refundBy: actorId };
      return current;
    },
    refundRequest: async () => request,
    approveRefund: async (_id, actorId) => {
      calls.push('approve');
      current = { ...current, refundApprovedBy: actorId };
      return current;
    },
    completeRefund: async () => {
      calls.push('complete');
      return current;
    },
  };
  return {
    service: new AdminPaymentsService(repo, async (to, vars) => {
      expect(to).toBe('benhnhan@example.test');
      expect(vars.maGiaoDich).toBe('HOAN-123');
      calls.push('email');
    }),
    calls,
  };
}

describe('A07 phạm vi và hoàn tiền', () => {
  it('kế toán cơ sở A không đọc hoặc gán giao dịch cơ sở B', async () => {
    const { service, calls } = fake({ ...row, facilityId: 'facility-b' });
    expect(() => service.list(manager, { page: 1, pageSize: 20, facilityId: 'facility-b' })).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    await expect(service.match(manager, row.id, 'MQ123456')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls).toEqual([]);
  });

  it('trên 2 triệu cần người khác duyệt trước khi xác nhận đã hoàn', async () => {
    const { service, calls } = fake();
    await service.requestRefund(manager, row.id, 2_200_000, 'Bệnh nhân hủy phiếu');
    const done = { refundedAt: '2026-10-27T08:00:00+07:00', refundRef: 'HOAN-123' };
    await expect(service.completeRefund(manager, row.id, done)).rejects.toMatchObject({
      code: 'A07_REFUND_APPROVAL_REQUIRED',
    });
    await expect(
      service.approveRefund({ ...manager, permissions: [...manager.permissions, 'refund:approve'] }, row.id),
    ).rejects.toMatchObject({ code: 'A07_REFUND_TWO_PERSON' });
    await service.approveRefund(approver, row.id);
    await service.completeRefund(manager, row.id, done);
    expect(calls).toEqual(['request', 'approve', 'complete', 'email']);
  });

  it('từ chối hoàn vượt tiền thực nhận', async () => {
    const { service, calls } = fake();
    await expect(service.requestRefund(manager, row.id, 2_300_000, 'Sai số tiền')).rejects.toMatchObject({
      code: 'A07_REFUND_AMOUNT',
    });
    expect(calls).toEqual([]);
  });

  it('khoản đến muộn đã chờ hoàn vẫn lập được yêu cầu có người chịu trách nhiệm', async () => {
    const { service, calls } = fake({ ...row, status: 'REFUND_PENDING', refundBy: null });
    await service.requestRefund(manager, row.id, 2_200_000, 'Khoản đến sau khi phiếu quá hạn');
    expect(calls).toEqual(['request']);
  });

  it('không cho hoàn một giao dịch đã thanh toán khi phiếu vẫn còn hiệu lực', async () => {
    const { service, calls } = fake({ ...row, appointmentStatus: 'DA_CO_STT' });
    await expect(service.requestRefund(manager, row.id, 2_200_000, 'Yêu cầu sai')).rejects.toMatchObject({
      code: 'A07_REFUND_STATE',
    });
    expect(calls).toEqual([]);
  });

  it('CSV vô hiệu công thức bảng tính từ dữ liệu SePay', async () => {
    const { service } = fake({ ...row, providerTxnId: '=HYPERLINK("https://example.com")' });
    const csv = await service.csv(manager, { page: 1, pageSize: 20 });
    expect(csv).toContain("'=HYPERLINK");
  });
});
