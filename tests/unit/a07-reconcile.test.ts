import { describe, expect, it, vi } from 'vitest';
import { reconcileBookings, type WebBooking } from '@/lib/domain/payment/reconcile';
import type { HisGateway } from '@/lib/domain/ports';
import { ReconcileService } from '@/lib/services/reconcile/reconcile-service';
import type { ReconcileRepository } from '@/lib/services/reconcile/types';

const web: WebBooking = {
  id: 'appointment-1',
  code: 'MQ123456',
  hisId: '1234',
  hisBookingId: '555',
  bookingApi: 'PAID',
  payMethod: 'ONLINE',
  status: 'DA_CO_STT',
  stt: 10,
  amount: 220000,
  paymentStatus: 'PAID',
  paidAmount: 220000,
};

describe('A07/C09 đối chiếu lịch và tiền', () => {
  it('khớp bằng hisId, phát hiện STT và tiền lệch mà không lưu dữ liệu bệnh nhân', () => {
    const result = reconcileBookings(
      [web],
      [{ key: '1234', bookingId: '555', kind: 'PAID', stt: 11, amount: 230000, status: 1 }],
    );
    expect(result).toMatchObject({ matched: 0, missingInHis: 0, amountDiff: 1 });
    expect(result.issues.map((item) => item.kind)).toEqual(['STT_MISMATCH', 'AMOUNT_MISMATCH']);
    expect(result.actions).toEqual([{ appointmentId: web.id, reconciled: true, stt: 11 }]);
    expect(JSON.stringify(result)).not.toContain('patient_name');
  });

  it('thiếu HIS thì xếp lại outbox, lịch HIS lạ được báo thiếu trên web', () => {
    const result = reconcileBookings(
      [web],
      [{ key: '9999', bookingId: null, kind: 'PAID', stt: 1, amount: 220000, status: 1 }],
    );
    expect(result).toMatchObject({ missingInHis: 1, missingInWeb: 1 });
    expect(result.actions[0]).toMatchObject({ status: 'LOI_HIS', enqueueOutbox: true });
  });

  it('HIS status 2 cần hoàn tiền nhưng không tự xác nhận đã chuyển khoản', () => {
    const result = reconcileBookings(
      [web],
      [{ key: '1234', bookingId: null, kind: 'PAID', stt: 10, amount: 220000, status: 2 }],
    );
    expect(result.statusChanged).toBe(1);
    expect(result.actions[0]?.status).toBe('CHO_HOAN_TIEN');
  });

  it('một lịch HIS không được ghép với hai phiếu web cùng khóa', () => {
    const result = reconcileBookings(
      [web, { ...web, id: 'appointment-2', code: 'MQ222222' }],
      [{ key: '1234', bookingId: '555', kind: 'PAID', stt: 10, amount: 220000, status: 1 }],
    );
    expect(result).toMatchObject({ matched: 1, missingInHis: 1, missingInWeb: 0 });
  });
});

function fakeService(hisAmount = 220000) {
  const saves: string[] = [];
  const calls: string[] = [];
  const alerts: string[] = [];
  const repo: ReconcileRepository = {
    dueFacilities: async () => [
      { id: 'facility-a', name: 'A', reconcileTime: '21:00' },
      { id: 'facility-b', name: 'B', reconcileTime: '22:00' },
    ],
    facilities: async () => [{ id: 'facility-a', name: 'A', reconcileTime: '21:00' }],
    alertRecipients: async () => [],
    bookings: async () => [web],
    bankTotals: async () => ({ incoming: 220000, booked: 220000, difference: 0 }),
    hasCompleted: async () => false,
    save: async (input) => {
      saves.push(input.examDate);
      return {
        id: 'batch',
        facilityId: input.facilityId,
        facilityName: 'A',
        examDate: input.examDate,
        matched: input.result.matched,
        missingInHis: input.result.missingInHis,
        missingInWeb: input.result.missingInWeb,
        statusChanged: input.result.statusChanged,
        amountDiff: input.result.amountDiff,
        issues: input.result.issues,
        bank: input.bank,
        startedAt: input.startedAt,
        finishedAt: input.finishedAt,
      };
    },
    list: async () => ({ rows: [], total: 0 }),
    log: async () => {},
  };
  const his: HisGateway = {
    call: async (_facility, path, body) => {
      calls.push(`${path}:${JSON.stringify(body)}`);
      return (
        path.endsWith('GetBookingOfDay')
          ? [
              {
                id: 1234,
                idbooking: 555,
                booking_number: 10,
                amount: hisAmount,
                status: 1,
                patient_name: 'Không được lưu',
              },
            ]
          : []
      ) as never;
    },
  };
  const service = new ReconcileService({
    repo,
    his,
    now: () => new Date('2026-10-27T14:03:00Z'),
    lock: { acquire: async () => async () => {} },
    notifyMismatch: async (facilityId, examDate, issues) => {
      alerts.push(`${facilityId}:${examDate}:${issues}`);
    },
  });
  return { service, saves, calls, alerts };
}

describe('A07 job theo giờ cơ sở', () => {
  it('chạy ngày hiện tại và kế tiếp cho cơ sở đến giờ', async () => {
    const { service, saves, calls } = fakeService();
    await service.runDue();
    expect(saves).toEqual(['2026-10-27', '2026-10-28']);
    expect(calls[0]).toContain('BookingDate":"27/10/2026');
    expect(calls.some((item) => item.includes('GetBooking_UnpaidOfDay'))).toBe(true);
  });

  it('chặn chạy chồng theo cơ sở và ngày', async () => {
    const { service } = fakeService();
    const lock = (service as unknown as { d: { lock: { acquire: unknown } } }).d.lock;
    lock.acquire = vi.fn(async () => null);
    await expect(service.run('facility-a', '2026-10-27')).rejects.toMatchObject({
      code: 'A07_RECONCILE_BUSY',
    });
  });

  it('có lệch tiền thì gửi một cảnh báo không kèm dữ liệu bệnh nhân', async () => {
    const { service, alerts } = fakeService(230000);
    await service.run('facility-a', '2026-10-27');
    expect(alerts).toEqual(['facility-a:2026-10-27:1']);
  });
});
