import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { BookingDraft } from '@/lib/domain/booking/draft';
import type { BookingRecord, BookingRepository } from '@/lib/domain/booking/confirm';
import type { IdentResult } from '@/lib/domain/identity/types';
import type { HisGateway } from '@/lib/domain/ports';
import { BookingService } from '@/lib/services/booking/booking-service';
import type { CatalogService } from '@/lib/services/catalog/catalog-service';
import type { BookingDraftService } from '@/lib/services/catalog/booking-draft-service';

const draft: BookingDraft = {
  id: '19f3ba66-4567-4321-a321-b8bf8723c65d',
  accountId: 'account',
  facilityCode: 'BVA',
  mode: 'ROOM',
  specialtyHisId: 'NOI',
  specialtyName: 'Nội tổng quát',
  roomHisId: 101,
  roomName: 'Phòng Nội',
  examDate: '2026-11-01',
  slotHisId: 1,
  slotLabel: '07:00–08:00',
  objectType: 'DICH_VU',
  amount: 200000,
};
const found: IdentResult = {
  status: 'FOUND',
  maBN: '24000001',
  hisFullName: 'HIS NGUYEN VAN A',
  hisBirthYear: 1990,
  hisPhone: '0900000001',
  hisSex: 1,
  hasVisited: true,
  checkedAt: '2026-10-27',
};
const fresh: IdentResult = { status: 'NEW_PATIENT', checkedAt: '2026-10-27' };

function harness(patient: 'FOUND' | 'NEW_PATIENT', objectType: 'DICH_VU' | 'BHYT') {
  const d = { ...draft, objectType };
  const identity = patient === 'FOUND' ? found : fresh;
  const map = new Map<string, unknown>();
  const ids = new Map<string, string>();
  const calls: { path: string; body: unknown }[] = [];
  const outbox: { id: string; code: string; command: string; attempts: number }[] = [];
  let row: BookingRecord | null = null;
  let failWrite = false;
  let existingHis = false;
  const cache = {
    async get<T>(key: string) {
      return (map.get(key) as T | undefined) ?? null;
    },
    async set(key: string, value: unknown) {
      map.set(key, value);
    },
    async del(key: string) {
      map.delete(key);
    },
  };
  const repo: BookingRepository = {
    async findByCode(code) {
      return row?.code === code ? row : null;
    },
    async hasSameDay() {
      return false;
    },
    async create(input) {
      row = {
        id: 'appointment',
        code: input.code,
        hisId: input.hisId,
        accountId: input.accountId,
        facilityId: input.facilityId,
        facilityCode: 'BVA',
        facilityName: 'Bệnh viện A',
        maBN: input.maBN ?? null,
        isNewPatient: input.isNewPatient,
        specialtyHisId: d.specialtyHisId,
        specialtyName: d.specialtyName,
        doctorHisId: null,
        doctorName: null,
        roomHisId: d.roomHisId,
        roomName: d.roomName,
        examDate: d.examDate,
        slotHisId: d.slotHisId,
        slotLabel: d.slotLabel,
        bookingNumber: d.bookingNumber ?? 7,
        objectType: d.objectType,
        payMethod: input.payMethod,
        bookingApi: input.bookingApi,
        amount: d.amount,
        status: input.status,
        stt: null,
        hisBookingId: null,
        paidAt: null,
      };
      return row;
    },
    async setPatient(_code, maBN) {
      if (row) row.maBN = maBN;
    },
    async setStatus(_code, status) {
      if (row) row.status = status;
    },
    async setBooked(_code, stt, hisBookingId) {
      if (!row) throw new Error('No row');
      row.status = 'DA_CO_STT';
      row.stt = stt;
      row.hisBookingId = hisBookingId;
      return row;
    },
    async enqueueOutbox(record, command) {
      outbox.push({ id: 'outbox', code: record.code, command, attempts: 0 });
    },
    async dueOutbox() {
      return [...outbox];
    },
    async finishOutbox() {
      outbox.shift();
    },
    async deferOutbox() {},
    async audit() {},
  };
  const his: HisGateway = {
    async call<T>(_facility: string, path: string, body: unknown): Promise<T> {
      calls.push({ path, body });
      if (path === 'Patients/PostPatients_checkbh') return { result: true } as T;
      if (path === 'Booking/PostPatientBHYT') return {} as T;
      if (path === 'Patients/PostPatients') return { id: '2600000001' } as T;
      if (path === 'Booking/GetBookingByID') {
        if (!existingHis) throw new AppError('NOT_FOUND');
        return { id: row?.hisId.toString(), booking_number: 7 } as T;
      }
      if (path === 'Booking/GetBooking_Unpaid') {
        if (!existingHis) throw new AppError('NOT_FOUND');
        return { IDDK: '123', MABN: row?.maBN, NGAY: '20261101', SO: 7 } as T;
      }
      if (failWrite) throw new AppError('HIS_UNAVAILABLE');
      return path === 'Booking/PostBooking'
        ? ({ Numerical_order: 7, id: row?.hisId.toString() } as T)
        : ({ Numerical_Order: 7, Booking_ID: '123' } as T);
    },
  };
  const service = new BookingService({
    drafts: {
      load: async () => d,
      hold: async () => ({ ...d, bookingNumber: 7 }),
    } as unknown as BookingDraftService,
    catalog: {
      facility: async () => ({
        id: 'facility',
        code: 'BVA',
        name: 'Bệnh viện A',
        allowBhyt: true,
        payOptions: ['ONLINE', 'AT_FACILITY'],
      }),
      slots: async () => [{ id: 1, doctorId: '11' }],
      locations: async (_c: string, kind: string) => [
        { id: kind === 'cities' ? '79' : kind === 'districts' ? '760' : '1' },
      ],
    } as unknown as CatalogService,
    identity: { resolve: async () => identity },
    accounts: async () => ({
      fullName: 'Nguyễn Văn A',
      birthYear: 1990,
      gender: 1,
      phone: '0912345678',
      socialId: '079090000001',
      email: 'a@example.test',
      addressLine: '1 Đường A',
    }),
    booking: repo,
    his,
    cache,
    mailer: { send: async () => {} },
    idempotency: {
      async read(_a, key) {
        return ids.get(key) ?? null;
      },
      async begin(_a, key) {
        if (ids.has(key)) return false;
        ids.set(key, 'PENDING');
        return true;
      },
      async complete(_a, key, code) {
        ids.set(key, code);
      },
      async release(_a, key) {
        ids.delete(key);
      },
    },
    onMailError: () => {},
  });
  return {
    service,
    calls,
    outbox,
    get row() {
      return row;
    },
    setFail(v: boolean) {
      failWrite = v;
    },
    setExisting(v: boolean) {
      existingHis = v;
    },
  };
}

describe('C06 booking', () => {
  for (const patient of ['FOUND', 'NEW_PATIENT'] as const) {
    for (const pay of ['ONLINE', 'AT_FACILITY'] as const) {
      it(`${patient} dịch vụ ${pay}`, async () => {
        const h = harness(patient, 'DICH_VU');
        if (patient === 'NEW_PATIENT')
          await h.service.saveAddress('account', draft.id, {
            cityId: '79',
            districtId: '760',
            wardId: '1',
            address: '1 Đường A',
          });
        const result = await h.service.confirm('account', draft.id, 'key-12345678', pay);
        if (pay === 'ONLINE') {
          expect(result.status).toBe('CHO_THANH_TOAN');
          expect(h.calls.some((c) => c.path === 'Booking/PostBooking')).toBe(false);
          if (h.row) {
            h.row.paidAt = new Date();
            h.row.status = 'DA_THANH_TOAN';
          }
          await h.service.fulfillPaid(result.code);
        }
        expect(h.row?.status).toBe('DA_CO_STT');
        expect(
          h.calls.some(
            (c) => c.path === (pay === 'ONLINE' ? 'Booking/PostBooking' : 'Booking/PostBooking_Unpaid'),
          ),
        ).toBe(true);
        expect(h.calls.some((c) => c.path === 'Patients/PostPatients')).toBe(patient === 'NEW_PATIENT');
      });
    }
  }

  for (const pay of ['ONLINE', 'AT_FACILITY'] as const) {
    it(`FOUND BHYT ${pay}`, async () => {
      const h = harness('FOUND', 'BHYT');
      const result = await h.service.confirm('account', draft.id, 'key-12345678', pay);
      if (pay === 'ONLINE' && h.row) {
        h.row.paidAt = new Date();
        h.row.status = 'DA_THANH_TOAN';
        await h.service.fulfillPaid(result.code);
      }
      expect(h.calls.map((c) => c.path)).toContain('Patients/PostPatients_checkbh');
      expect(h.row?.status).toBe('DA_CO_STT');
    });
  }

  it('chặn BHYT cho bệnh nhân mới', async () => {
    const h = harness('NEW_PATIENT', 'BHYT');
    await expect(h.service.confirm('account', draft.id, 'key-12345678')).rejects.toMatchObject({
      code: 'BOOKING_BHYT_NOT_ALLOWED',
    });
  });

  it('cùng idempotency key trả lại phiếu cũ', async () => {
    const h = harness('FOUND', 'DICH_VU');
    const first = await h.service.confirm('account', draft.id, 'key-12345678');
    const again = await h.service.confirm('account', draft.id, 'key-12345678');
    expect(again.code).toBe(first.code);
    expect(h.calls.filter((c) => c.path === 'Booking/PostBooking_Unpaid')).toHaveLength(1);
  });

  it('mất phản hồi thì worker lấy lịch đã ghi, không gửi lặp', async () => {
    const h = harness('FOUND', 'DICH_VU');
    h.setFail(true);
    const result = await h.service.confirm('account', draft.id, 'key-12345678');
    expect(result.status).toBe('LOI_HIS');
    expect(h.outbox).toHaveLength(1);
    h.setExisting(true);
    await h.service.retryDue();
    expect(h.row?.status).toBe('DA_CO_STT');
    expect(h.calls.filter((c) => c.path === 'Booking/PostBooking_Unpaid')).toHaveLength(1);
  });
});
