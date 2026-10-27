import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import { canSelfCancel, cancellationDeadline } from '@/lib/domain/booking/cancel-policy';
import type { TicketRepository, TicketRow } from '@/lib/domain/booking/cancel-types';
import { TicketService } from '@/lib/services/ticket/ticket-service';
import { signTicketCode, signedTicketQr, verifyTicketCode } from '@/lib/services/ticket/ticket-qr';

const base: TicketRow = {
  id: 'appointment-1',
  code: 'MQABC12345',
  accountId: 'account-1',
  facilityId: 'facility-1',
  facilityCode: 'BVA',
  facilityName: 'Bệnh viện A',
  facilityAddress: 'Quận 1',
  facilityHotline: null,
  cancelCutoff: 'D-1 15:00',
  maBN: '2600000001',
  fullName: 'Nguyễn Văn Mẫu',
  birthYear: 1990,
  email: 'patient@example.com',
  specialtyName: 'Nội tổng quát',
  doctorName: 'Bác sĩ Mẫu',
  roomName: 'Phòng 1',
  examDate: '2026-10-28',
  slotLabel: '08:00–09:00',
  objectType: 'DICH_VU',
  payMethod: 'AT_FACILITY',
  bookingApi: 'UNPAID',
  amount: 220000,
  status: 'DA_CO_STT',
  stt: 18,
  hisId: '123456789',
  hisBookingId: 'IDDK001',
  paidAt: null,
  cancelRequest: false,
};

function setup(row: TicketRow = base, handler: (path: string, body: unknown) => unknown = () => 'IDDK001') {
  const calls: { path: string; body: unknown }[] = [];
  const changes: string[] = [];
  let current = row;
  const repo: TicketRepository = {
    list: async () => ({ rows: [current], total: 1 }),
    find: async () => current,
    updateStt: async (_code, stt) => {
      changes.push(`stt:${stt}`);
      current = { ...current, stt };
    },
    requestCancel: async () => {
      changes.push('request');
      current = { ...current, cancelRequest: true };
    },
    confirmCancel: async () => {
      changes.push('cancel');
      current = { ...current, status: current.paidAt ? 'CHO_HOAN_TIEN' : 'DA_HUY' };
    },
    facilitiesForDate: async () => [{ id: 'facility-1', code: 'BVA' }],
    activeForDate: async () => [current],
    markExamined: async () => {
      changes.push('examined');
    },
    logSync: async (_id, ok, updated) => {
      changes.push(`sync:${ok}:${updated}`);
    },
    remindCandidates: async () => [current],
    claimReminder: async () => true,
  };
  const svc = new TicketService({
    repo,
    his: {
      async call<T>(_facilityId: string, path: string, body: unknown) {
        calls.push({ path, body });
        const value = handler(path, body);
        if (value instanceof Error) throw value;
        return value as T;
      },
    },
    identity: { resolve: async () => ({ maBN: '2600000001' }) },
    notify: {
      create: async () => {
        changes.push('notification');
      },
      queueEmail: async () => {
        changes.push('email');
      },
    },
    withCancelLock: async (_code, action) => action(),
    now: () => new Date('2026-10-27T07:00:00Z'),
    qrSecret: 'a'.repeat(32),
  });
  return { svc, calls, changes };
}

describe('C08 hạn hủy', () => {
  it('giờ chốt D-1 15:00 tại Việt Nam được đổi sang UTC chính xác', () => {
    expect(cancellationDeadline('2026-10-28', 'D-1 15:00').toISOString()).toBe('2026-10-27T08:00:00.000Z');
    expect(canSelfCancel('2026-10-28', 'D-1 15:00', new Date('2026-10-27T07:59:59Z'))).toBe(true);
    expect(canSelfCancel('2026-10-28', 'D-1 15:00', new Date('2026-10-27T08:00:00Z'))).toBe(false);
  });
  it('quá giờ chốt không gọi HIS', async () => {
    const { svc, calls } = setup({ ...base, cancelCutoff: 'D-2 15:00' });
    await expect(svc.cancel(base.accountId, base.code, 'Không đến được')).rejects.toMatchObject({
      code: 'CANCEL_NOT_ALLOWED',
    });
    expect(calls).toHaveLength(0);
  });
});

describe('C08 hủy phiếu', () => {
  it('phiếu tại viện gọi Delbooking_Unpaid rồi chuyển DA_HUY, gửi email', async () => {
    const { svc, calls, changes } = setup();
    const result = await svc.cancel(base.accountId, base.code, 'Không đến được');
    expect(calls[0]).toEqual({ path: 'Booking/Delbooking_Unpaid', body: { IDDK: 'IDDK001' } });
    expect(result.ticket.status).toBe('DA_HUY');
    expect(changes).toEqual(['cancel', 'notification', 'email']);
  });
  it('HIS -46 giữ phiếu còn hiệu lực và tạo yêu cầu cho cơ sở', async () => {
    const paid = { ...base, bookingApi: 'PAID' as const, payMethod: 'ONLINE' as const, paidAt: new Date() };
    const { svc, changes } = setup(paid, () => new AppError('CANCEL_PAID_NOT_ALLOWED'));
    const result = await svc.cancel(base.accountId, base.code, 'Đổi lịch');
    expect(result.requested).toBe(true);
    expect(result.ticket.status).toBe('DA_CO_STT');
    expect(result.ticket.cancelRequest).toBe(true);
    expect(changes).toEqual(['request']);
  });
  it('hủy phiếu đã trả tiền chuyển chờ hoàn tiền', async () => {
    const paid = { ...base, bookingApi: 'PAID' as const, payMethod: 'ONLINE' as const, paidAt: new Date() };
    const { svc, calls, changes } = setup(paid, () => ({ result: 1 }));
    const result = await svc.cancel(base.accountId, base.code, 'Đổi lịch');
    expect(calls[0]).toEqual({ path: 'Booking/Delbooking', body: { ID: 'IDDK001' } });
    expect(result.ticket.status).toBe('CHO_HOAN_TIEN');
    expect(changes).toContain('cancel');
  });
  it('HIS báo đã hủy -45 thì đồng bộ trạng thái tại web', async () => {
    const { svc, changes } = setup(base, () => new AppError('HIS_ERROR', undefined, { hisCode: '-45' }));
    const result = await svc.cancel(base.accountId, base.code, 'Không đến được');
    expect(result.ticket.status).toBe('DA_HUY');
    expect(changes).toContain('cancel');
  });
  it('Delbooking_Unpaid chỉ được xác nhận khi DATKHAM không còn IDDK', async () => {
    const { svc, calls, changes } = setup(base, (path) =>
      path === 'Booking/Delbooking_Unpaid' ? new SyntaxError('Plain IDDK response') : [],
    );
    const result = await svc.cancel(base.accountId, base.code, 'Không đến được');
    expect(result.ticket.status).toBe('DA_HUY');
    expect(calls[1]).toMatchObject({ path: 'Booking/GetBooking_UnpaidOfDay' });
    expect(changes).toContain('cancel');
  });
  it('không đánh dấu hủy nếu DATKHAM vẫn còn IDDK', async () => {
    const { svc, changes } = setup(base, (path) =>
      path === 'Booking/Delbooking_Unpaid'
        ? new SyntaxError('Plain IDDK response')
        : [{ IDDK: 'IDDK001', MABN: base.maBN, NGAY: '20261028', SO: '18' }],
    );
    await expect(svc.cancel(base.accountId, base.code, 'Không đến được')).rejects.toBeInstanceOf(SyntaxError);
    expect(changes).not.toContain('cancel');
  });
  it('không đọc phiếu của tài khoản khác', async () => {
    const { svc, calls } = setup();
    await expect(svc.detail('other', base.code)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(calls).toHaveLength(0);
  });
});

describe('C08 STT và trạng thái', () => {
  it('tải lại STT tại viện bằng MaBN lấy từ identity server', async () => {
    const { svc, calls, changes } = setup(base, () => ({
      IDDK: 'IDDK001',
      MABN: '2600000001',
      NGAY: '20261028',
      SO: 24,
    }));
    const ticket = await svc.refreshStt(base.accountId, base.code);
    expect(calls[0]).toEqual({
      path: 'Booking/GetBooking_Unpaid',
      body: { patient_code: '2600000001', booking_date: '20261028' },
    });
    expect(ticket.stt).toBe(24);
    expect(changes).toContain('stt:24');
  });
  it('tải STT từ DATKHAM khi GetBooking_Unpaid chỉ đọc BOOKINGPKH', async () => {
    const { svc, calls } = setup(base, (path) =>
      path === 'Booking/GetBooking_Unpaid'
        ? new AppError('NOT_FOUND')
        : [{ IDDK: 'IDDK001', MABN: '2600000001', NGAY: '20261028', SO: '29' }],
    );
    const result = await svc.refreshStt(base.accountId, base.code);
    expect(calls.map((call) => call.path)).toEqual([
      'Booking/GetBooking_Unpaid',
      'Booking/GetBooking_UnpaidOfDay',
    ]);
    expect(result.stt).toBe(29);
  });
  it('tải lại STT phiếu online theo idbooking HIS', async () => {
    const paid = { ...base, bookingApi: 'PAID' as const, hisBookingId: '987654321' };
    const { svc, calls } = setup(paid, () => ({
      id: paid.hisId,
      idbooking: paid.hisBookingId,
      booking_number: 33,
    }));
    const result = await svc.refreshStt(base.accountId, base.code);
    expect(calls[0]).toEqual({ path: 'Booking/GetBookingByID', body: { ID: paid.hisBookingId } });
    expect(result.stt).toBe(33);
  });
  it('GetBookingOfDay trạng thái 1 chuyển đã khám', async () => {
    const paid = { ...base, bookingApi: 'PAID' as const };
    const { svc, changes } = setup(paid, (path) =>
      path === 'Booking/GetBookingOfDay'
        ? [{ id: '123456789', idbooking: 'IDDK001', booking_number: 18, status: 1 }]
        : [],
    );
    await svc.syncToday();
    expect(changes).toContain('examined');
    expect(changes).toContain('sync:true:1');
  });
  it('GetBookingOfDay trạng thái 2 chuyển hủy', async () => {
    const paid = { ...base, bookingApi: 'PAID' as const };
    const { svc, changes } = setup(paid, (path) =>
      path === 'Booking/GetBookingOfDay'
        ? [{ id: '123456789', idbooking: 'IDDK001', booking_number: 18, status: 2 }]
        : [],
    );
    await svc.syncToday();
    expect(changes).toContain('cancel');
    expect(changes).toContain('email');
  });
  it('GetBooking_UnpaidOfDay cập nhật STT phiếu tại viện', async () => {
    const { svc, changes } = setup(base, (path) =>
      path === 'Booking/GetBooking_UnpaidOfDay'
        ? [{ IDDK: 'IDDK001', MABN: '2600000001', NGAY: '20261028', SO: '31' }]
        : [],
    );
    await svc.syncToday();
    expect(changes).toContain('stt:31');
  });
});

describe('C08 QR', () => {
  it('QR ký HMAC; đổi mã hoặc chữ ký đều bị từ chối', () => {
    const secret = 'a'.repeat(32);
    const token = signTicketCode(base.code, secret);
    expect(verifyTicketCode(token, secret)).toBe(base.code);
    expect(verifyTicketCode(token.replace('ABC', 'ABD'), secret)).toBeNull();
    expect(signedTicketQr(base.code, secret)).toContain('<svg');
  });
});
