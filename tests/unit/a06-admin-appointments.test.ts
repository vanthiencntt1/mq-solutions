import { describe, expect, it, vi } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { AdminAppointmentDetail, AdminAppointmentRepository } from '@/lib/domain/ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { AdminAppointmentsService } from '@/lib/services/admin-appointments/admin-appointments-service';
import { AppointmentQuerySchema } from '@/lib/services/admin-appointments/schemas';
import { signTicketCode, verifyTicketCode } from '@/lib/services/ticket/ticket-qr';

const actor: AdminPrincipal = {
  id: 'admin-1',
  role: 'FACILITY_STAFF',
  facilityIds: ['facility-1'],
  name: 'Quầy',
  permissions: ['appointment:*'],
};
const date = new Date('2026-10-27T00:00:00Z');
const row: AdminAppointmentDetail = {
  id: 'id-1',
  accountId: 'account-1',
  code: 'MQABCDEF12',
  facilityId: 'facility-1',
  facilityName: 'Bệnh viện A',
  facilityCode: 'BVA',
  patientName: 'Nguyễn Văn An',
  maBN: '12345678',
  isNewPatient: false,
  specialtyName: 'Nội',
  doctorName: null,
  roomName: 'P1',
  examDate: date,
  slotLabel: '08:00–09:00',
  status: 'DA_CO_STT',
  payMethod: 'AT_FACILITY',
  bookingApi: 'UNPAID',
  objectType: 'BHYT',
  amount: 220000,
  stt: 12,
  hisBookingId: 'HIS-1',
  hisError: null,
  cancelRequest: false,
  checkedInAt: null,
  paidAt: null,
  createdAt: date,
  events: [],
  outbox: [],
};

function setup(appointment = row) {
  const hisCall = vi.fn(async (_facilityId: string, _path: string, _body: unknown): Promise<unknown> => true);
  const resolveMaBN = vi.fn(async () => appointment.maBN);
  const withCancelLock = vi.fn((_code: string, action: () => Promise<unknown>): Promise<unknown> => action());
  const repo = {
    list: vi.fn(async () => ({ rows: [appointment], total: 1 })),
    find: vi.fn(async (_code: string, ids: string[] | null) =>
      ids?.includes(appointment.facilityId) ? appointment : null,
    ),
    facilities: vi.fn(async () => [{ id: 'facility-1', name: 'Bệnh viện A' }]),
    retry: vi.fn(async () => {}),
    note: vi.fn(async () => {}),
    confirmCancel: vi.fn(async () => {}),
    cancel: vi.fn(async () => {}),
    requestCancel: vi.fn(async () => {}),
    setStt: vi.fn(async () => {}),
    checkIn: vi.fn(async () => true),
    auditView: vi.fn(async () => {}),
    email: vi.fn(async () => 'patient@example.com'),
    auditResend: vi.fn(async () => {}),
  } as unknown as AdminAppointmentRepository;
  return {
    repo,
    hisCall,
    resolveMaBN,
    withCancelLock,
    service: new AdminAppointmentsService({
      repo,
      sign: (code) => `${code}.${'a'.repeat(16)}`,
      verify: (token) => (token === `${appointment.code}.${'a'.repeat(16)}` ? appointment.code : null),
      queueTicketEmail: vi.fn(async () => {}),
      his: {
        call: <T>(facilityId: string, path: string, body: unknown) =>
          hisCall(facilityId, path, body) as Promise<T>,
      },
      resolveMaBN,
      withCancelLock: <T>(code: string, action: () => Promise<T>) =>
        withCancelLock(code, action) as Promise<T>,
      now: () => new Date('2026-10-27T03:00:00Z'),
    }),
  };
}

describe('A06 admin appointments', () => {
  it('limits list to facility and masks patient identifiers', async () => {
    const { service, repo } = setup();
    const result = await service.list(actor, AppointmentQuerySchema.parse({ hasHisError: 'true' }));
    expect(repo.list).toHaveBeenCalledWith(
      expect.objectContaining({ facilityIds: ['facility-1'], hasHisError: true, status: 'LOI_HIS' }),
    );
    expect(result.rows[0]?.maBN).toBe('****5678');
    expect(result.rows[0]?.patientName).not.toBe('Nguyễn Văn An');
    expect(result.rows[0]).not.toHaveProperty('accountId');
    await expect(
      service.list(
        actor,
        AppointmentQuerySchema.parse({ facilityId: '00000000-0000-4000-8000-000000000002' }),
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('rejects a forged QR before reading a patient record', async () => {
    const { service, repo } = setup();
    await expect(service.lookup(actor, { token: `${row.code}.${'b'.repeat(16)}` })).rejects.toMatchObject({
      code: 'A06_QR_INVALID',
    });
    expect(repo.find).not.toHaveBeenCalled();
  });

  it('accepts a QR signed by the C08 patient ticket', async () => {
    const { repo } = setup();
    const secret = 'a'.repeat(32);
    const service = new AdminAppointmentsService({
      repo,
      sign: (code) => signTicketCode(code, secret),
      verify: (token) => verifyTicketCode(token, secret),
      queueTicketEmail: async () => {},
      his: { call: async <T>() => true as T },
      resolveMaBN: async () => row.maBN,
      withCancelLock: async (_code, action) => action(),
      now: () => new Date('2026-10-27T03:00:00Z'),
    });
    await expect(service.lookup(actor, { token: signTicketCode(row.code, secret) })).resolves.toMatchObject({
      code: row.code,
    });
  });

  it('checks in only a valid same-day ticket and audits through repository', async () => {
    const { service, repo } = setup();
    await expect(service.checkIn(actor, row.code)).resolves.toMatchObject({ code: row.code });
    expect(repo.checkIn).toHaveBeenCalledWith(row.code, actor.id, expect.any(Date));
    const bad = setup({ ...row, status: 'DA_HUY' });
    await expect(bad.service.checkIn(actor, row.code)).rejects.toMatchObject({
      code: 'A06_CHECKIN_NOT_ALLOWED',
    });
  });

  it('only queues a failed HIS booking and requires a cancel request', async () => {
    const failed = setup({ ...row, status: 'LOI_HIS' });
    await failed.service.action(actor, row.code, { action: 'retry' });
    expect(failed.repo.retry).toHaveBeenCalled();
    await expect(
      failed.service.action(actor, row.code, { action: 'confirm-cancel', note: 'Đã hủy trên HIS' }),
    ).rejects.toBeInstanceOf(AppError);
    expect(failed.repo.confirmCancel).not.toHaveBeenCalled();
  });

  it('requires a cancellation right and records a HIS refusal as a request', async () => {
    const { service, repo, hisCall, withCancelLock } = setup();
    const readOnly = { ...actor, permissions: ['appointment:read'] };
    await expect(
      service.action(readOnly, row.code, { action: 'cancel', note: 'Bệnh nhân yêu cầu hủy' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(hisCall).not.toHaveBeenCalled();
    hisCall.mockRejectedValueOnce(new AppError('CANCEL_PAID_NOT_ALLOWED'));
    await expect(
      service.action(actor, row.code, { action: 'cancel', note: 'Bệnh nhân yêu cầu hủy' }),
    ).resolves.toMatchObject({ requested: true });
    expect(withCancelLock).toHaveBeenCalledWith(row.code, expect.any(Function));
    expect(repo.requestCancel).toHaveBeenCalledWith(
      row.code,
      actor.id,
      expect.any(Date),
      'Bệnh nhân yêu cầu hủy',
    );
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('confirms an unpaid HIS cancellation by rereading the appointment', async () => {
    const { service, repo, hisCall, resolveMaBN } = setup();
    hisCall.mockRejectedValueOnce(new SyntaxError('HIS returned a plain IDDK'));
    hisCall.mockRejectedValueOnce(new AppError('NOT_FOUND'));
    await expect(
      service.action(actor, row.code, { action: 'cancel', note: 'Đã đối chiếu yêu cầu hủy' }),
    ).resolves.toMatchObject({ requested: false });
    expect(resolveMaBN).toHaveBeenCalledWith(row.accountId, row.facilityCode);
    expect(hisCall).toHaveBeenNthCalledWith(2, row.facilityId, 'Booking/GetBooking_Unpaid', {
      patient_code: row.maBN,
      booking_date: '20261027',
    });
    expect(repo.cancel).toHaveBeenCalled();
  });

  it('does not mark a booking cancelled when HIS still returns the same IDDK', async () => {
    const { service, repo, hisCall } = setup();
    hisCall.mockRejectedValueOnce(new SyntaxError('HIS returned a plain IDDK'));
    hisCall.mockResolvedValueOnce({ IDDK: row.hisBookingId, MABN: row.maBN, NGAY: '20261027', SO: 12 });
    await expect(
      service.action(actor, row.code, { action: 'cancel', note: 'Kiểm tra hủy HIS' }),
    ).rejects.toBeInstanceOf(SyntaxError);
    expect(repo.cancel).not.toHaveBeenCalled();
  });

  it('exports masked CSV and escapes spreadsheet formulas', async () => {
    const { service } = setup({ ...row, facilityName: '=HYPERLINK("bad")' });
    const csv = await service.csv(actor, AppointmentQuerySchema.parse({}));
    expect(csv).toContain('****5678');
    expect(csv).not.toContain('12345678');
    expect(csv).toContain("'=HYPERLINK");
  });
});
