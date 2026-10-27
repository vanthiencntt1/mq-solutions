import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { planBooking } from '@/lib/domain/booking/branch';
import {
  patientAddressSchema,
  toBookingView,
  type BookingAccount,
  type BookingRepository,
  type PatientAddress,
  type PreparedBooking,
} from '@/lib/domain/booking/confirm';
import type { BookingDraftService } from '@/lib/services/catalog/booking-draft-service';
import type { CatalogService } from '@/lib/services/catalog/catalog-service';
import type { IdentResult } from '@/lib/domain/identity/types';
import {
  bookedSchema,
  existingPaidSchema,
  existingUnpaidSchema,
  insuranceCheckSchema,
  patientCreatedSchema,
} from '@/lib/domain/booking/outbox';
import type { PayMethod } from '@/lib/domain/booking/types';
import { AppError } from '@/lib/domain/errors';
import type { CacheStore, HisGateway, Mailer } from '@/lib/domain/ports';
import { maskMaBN, maskName, maskPhone } from '@/lib/utils/format';
import { bookingPayload, newPatientPayload } from './his-payload';
import { bookingConfirmedMail } from './mail-templates';

interface Idempotency {
  read(accountId: string, key: string): Promise<string | null>;
  begin(accountId: string, key: string): Promise<boolean>;
  complete(accountId: string, key: string, code: string): Promise<void>;
  release(accountId: string, key: string): Promise<void>;
}

interface BookingDeps {
  drafts: BookingDraftService;
  catalog: CatalogService;
  identity: {
    resolve(accountId: string, facilityCode: string, opts?: { refresh?: boolean }): Promise<IdentResult>;
  };
  accounts: (accountId: string) => Promise<BookingAccount | null>;
  booking: BookingRepository;
  his: HisGateway;
  cache: CacheStore;
  mailer: Mailer;
  idempotency: Idempotency;
  onMailError: (code: string) => void;
}

const addressKey = (draftId: string) => `booking:address:${draftId}`;
const draftCodeKey = (draftId: string) => `booking:confirmed:${draftId}`;
const isNetwork = (e: unknown) => e instanceof AppError && e.code === 'HIS_UNAVAILABLE';
// C06 mục 2–4: service giữ toàn bộ quyết định ở server, không tin nhánh do trình duyệt gửi.
export class BookingService {
  constructor(private readonly d: BookingDeps) {}

  async prepare(accountId: string, draftId: string): Promise<PreparedBooking> {
    const draft = await this.d.drafts.load(accountId, draftId);
    if (!draft) throw new AppError('NOT_FOUND');
    const [facility, ident] = await Promise.all([
      this.d.catalog.facility(draft.facilityCode),
      this.d.identity.resolve(accountId, draft.facilityCode),
    ]);
    if (ident.status === 'MISMATCH') throw new AppError('IDENTITY_MISMATCH');
    const account = await this.requireAccount(accountId);
    return {
      draft: {
        id: draft.id,
        facilityCode: draft.facilityCode,
        facilityName: facility.name,
        specialtyName: draft.specialtyName,
        doctorName: draft.doctorName,
        roomName: draft.roomName,
        examDate: draft.examDate,
        slotLabel: draft.slotLabel,
        objectType: draft.objectType,
        amount: draft.amount,
      },
      patient: {
        status: ident.status,
        nameMasked: maskName(ident.hisFullName ?? account.fullName),
        phoneMasked: maskPhone(ident.hisPhone ?? account.phone),
        maBNMasked: ident.maBN ? maskMaBN(ident.maBN) : undefined,
        birthYear: ident.hisBirthYear ?? account.birthYear,
        hasVisited: ident.hasVisited ?? false,
      },
      payOptions: facility.payOptions,
      address: await this.d.cache.get<PatientAddress>(addressKey(draftId)),
    };
  }

  async saveAddress(accountId: string, draftId: string, raw: unknown) {
    const draft = await this.d.drafts.load(accountId, draftId);
    if (!draft) throw new AppError('NOT_FOUND');
    const address = patientAddressSchema.parse(raw);
    // C03 mục 5: mã tỉnh/quận/phường phải thuộc danh mục của chính cơ sở.
    const [cities, districts, wards] = await Promise.all([
      this.d.catalog.locations(draft.facilityCode, 'cities'),
      this.d.catalog.locations(draft.facilityCode, 'districts', address.cityId),
      this.d.catalog.locations(draft.facilityCode, 'wards', address.districtId),
    ]);
    if (
      !cities.some((v) => v.id === address.cityId) ||
      !districts.some((v) => v.id === address.districtId) ||
      !wards.some((v) => v.id === address.wardId)
    )
      throw new AppError('VALIDATION_FAILED');
    await this.d.cache.set(addressKey(draftId), address, 24 * 60 * 60);
  }

  async confirm(
    accountId: string,
    draftId: string,
    idempotencyKey: string,
    payMethod: PayMethod = 'AT_FACILITY',
  ) {
    const prior = await this.d.idempotency.read(accountId, idempotencyKey);
    if (prior && prior !== 'PENDING') return this.get(accountId, prior);
    const confirmed = await this.d.cache.get<string>(draftCodeKey(draftId));
    if (confirmed) return this.get(accountId, confirmed);
    if (!(await this.d.idempotency.begin(accountId, idempotencyKey)))
      throw new AppError('BOOKING_IN_PROGRESS');
    const draftLock = `draft:${draftId}`;
    if (!(await this.d.idempotency.begin(accountId, draftLock))) {
      await this.d.idempotency.release(accountId, idempotencyKey);
      throw new AppError('BOOKING_IN_PROGRESS');
    }
    try {
      const result = await this.confirmLocked(accountId, draftId, idempotencyKey, payMethod);
      await this.d.idempotency.complete(accountId, draftLock, result.code);
      return result;
    } catch (err) {
      const code = await this.d.cache.get<string>(draftCodeKey(draftId));
      if (!code) {
        await this.d.idempotency.release(accountId, idempotencyKey);
        await this.d.idempotency.release(accountId, draftLock);
      }
      throw err;
    }
  }

  private async confirmLocked(accountId: string, draftId: string, key: string, payMethod: PayMethod) {
    const existing = await this.d.cache.get<string>(draftCodeKey(draftId));
    if (existing) {
      await this.d.idempotency.complete(accountId, key, existing);
      return this.get(accountId, existing);
    }
    const draft = await this.d.drafts.hold(accountId, draftId);
    const facility = await this.d.catalog.facility(draft.facilityCode);
    if (!facility.payOptions.includes(payMethod)) throw new AppError('BOOKING_PAYMENT_NOT_ALLOWED');
    const ident = await this.d.identity.resolve(accountId, facility.code);
    const plan = planBooking({
      ident: ident.status,
      hasVisited: !!ident.hasVisited,
      objectType: draft.objectType,
      payMethod,
      facilityAllowsBhyt: facility.allowBhyt,
    });
    if (await this.d.booking.hasSameDay(accountId, facility.id, draft.examDate))
      throw new AppError('BOOKING_ALREADY_TODAY');
    const address = await this.d.cache.get<unknown>(addressKey(draftId));
    if (plan.createPatientFirst && !patientAddressSchema.safeParse(address).success)
      throw new AppError('BOOKING_ADDRESS_REQUIRED');
    if (plan.checkInsurance) await this.checkInsurance(facility.id, ident, draft.examDate);
    const row = await this.d.booking.create({
      code: `MQ${randomBytes(5).toString('hex').toUpperCase()}`,
      hisId: randomBytes(8).readBigUInt64BE() & ((1n << 63n) - 1n),
      accountId,
      facilityId: facility.id,
      draft,
      maBN: ident.maBN,
      isNewPatient: plan.createPatientFirst,
      payMethod,
      bookingApi: plan.api,
      status: payMethod === 'ONLINE' ? 'CHO_THANH_TOAN' : 'DANG_GUI_HIS',
    });
    await this.d.cache.set(draftCodeKey(draftId), row.code, 24 * 60 * 60);
    await this.d.cache.set(`booking:draft-of:${row.code}`, draftId, 24 * 60 * 60);
    await this.d.idempotency.complete(accountId, key, row.code);
    await this.d.booking.audit(accountId, facility.id, row.code);
    if (plan.requiresPayment) return toBookingView(row);
    return this.sendBooking(accountId, row.code, draftId);
  }

  async fulfillPaid(code: string) {
    const row = await this.d.booking.findByCode(code);
    if (!row) throw new AppError('NOT_FOUND');
    if (row.status === 'DA_CO_STT') return toBookingView(row);
    if (row.payMethod !== 'ONLINE' || !row.paidAt) throw new AppError('BOOKING_PAYMENT_PENDING');
    if (!['DA_THANH_TOAN', 'LOI_HIS'].includes(row.status)) throw new AppError('BOOKING_IN_PROGRESS');
    await this.d.booking.setStatus(code, 'DANG_GUI_HIS');
    // Bệnh nhân mới: địa chỉ cho PostPatients nằm theo draft, phải tra lại sau khi thanh toán xong
    const draftId = await this.d.cache.get<string>(`booking:draft-of:${code}`);
    return this.sendBooking(row.accountId, code, draftId ?? undefined);
  }

  async get(accountId: string, code: string) {
    const row = await this.d.booking.findByCode(code);
    if (!row || row.accountId !== accountId) throw new AppError('NOT_FOUND');
    return toBookingView(row);
  }

  async retryDue() {
    const due = await this.d.booking.dueOutbox(20);
    for (const item of due) {
      try {
        await this.retryOne(item.code, item.command);
        await this.d.booking.finishOutbox(item.id);
      } catch (err) {
        const code = err instanceof AppError ? err.code : 'HIS_ERROR';
        await this.d.booking.deferOutbox(item.id, item.attempts + 1, code);
      }
    }
  }

  private async retryOne(code: string, command: string) {
    const row = await this.d.booking.findByCode(code);
    if (!row || row.status === 'DA_CO_STT' || row.status === 'DA_HUY') return;
    if (row.bookingApi === 'PAID' && !row.paidAt) throw new AppError('BOOKING_PAYMENT_PENDING');
    // C06 mục 4: tra HIS trước mọi lần gửi lại; đáp ứng mất phản hồi sau khi HIS đã ghi.
    if (row.maBN) {
      try {
        const raw =
          row.bookingApi === 'PAID'
            ? await this.d.his.call<unknown>(row.facilityId, 'Booking/GetBookingByID', {
                ID: row.hisId.toString(),
              })
            : await this.d.his.call<unknown>(row.facilityId, 'Booking/GetBooking_Unpaid', {
                patient_code: row.maBN,
                booking_date: row.examDate.replaceAll('-', ''),
              });
        if (raw === null) throw new AppError('NOT_FOUND');
        const found =
          row.bookingApi === 'PAID' ? existingPaidSchema.parse(raw) : existingUnpaidSchema.parse(raw);
        if (row.bookingApi === 'PAID') {
          const paid = found as z.infer<typeof existingPaidSchema>;
          if (paid.id !== row.hisId.toString()) throw new AppError('BOOKING_HIS_CONFLICT');
          await this.d.booking.setBooked(code, paid.booking_number, paid.idbooking ?? paid.id);
        } else {
          const unpaid = found as z.infer<typeof existingUnpaidSchema>;
          if (unpaid.MABN !== row.maBN || unpaid.NGAY !== row.examDate.replaceAll('-', ''))
            throw new AppError('BOOKING_HIS_CONFLICT');
          await this.d.booking.setBooked(code, unpaid.SO, unpaid.IDDK);
        }
        return;
      } catch (err) {
        if (!(err instanceof AppError && err.code === 'NOT_FOUND')) throw err;
      }
    } else if (command === 'POST_PATIENT_AND_BOOKING') {
      const fresh = await this.d.identity.resolve(row.accountId, row.facilityCode, { refresh: true });
      if (fresh.status === 'FOUND' && fresh.maBN) await this.d.booking.setPatient(code, fresh.maBN);
      else if (fresh.status !== 'NEW_PATIENT') throw new AppError('IDENTITY_MISMATCH');
    }
    await this.d.booking.setStatus(code, 'DANG_GUI_HIS');
    const draftId = await this.d.cache.get<string>(`booking:draft-of:${code}`);
    const result = await this.sendBooking(row.accountId, code, draftId ?? undefined);
    if (result.status !== 'DA_CO_STT') throw new AppError('HIS_UNAVAILABLE');
  }

  private async checkInsurance(facilityId: string, ident: IdentResult, date: string) {
    if (!ident.maBN) throw new AppError('BOOKING_BHYT_NOT_ALLOWED');
    const raw = await this.d.his.call<unknown>(facilityId, 'Patients/PostPatients_checkbh', {
      id: ident.maBN,
      NGAY: date.replaceAll('-', ''),
    });
    if (!insuranceCheckSchema.parse(raw).result) throw new AppError('BOOKING_BHYT_NOT_ALLOWED');
    // ApiDatKham PostPatientBHYT trả thông tin BHYT của ngày khám; kiểm tra trước khi đặt.
    await this.d.his.call<unknown>(facilityId, 'Booking/PostPatientBHYT', {
      patient_code: ident.maBN,
      date: date.replaceAll('-', ''),
    });
  }

  private async sendBooking(accountId: string, code: string, draftId?: string) {
    let row = await this.d.booking.findByCode(code);
    if (!row) throw new AppError('NOT_FOUND');
    const account = await this.requireAccount(accountId);
    try {
      let ident = await this.d.identity.resolve(accountId, row.facilityCode);
      if (row.isNewPatient && !row.maBN) {
        const address = await this.requireAddress(draftId, code);
        const raw = await this.d.his.call<unknown>(
          row.facilityId,
          'Patients/PostPatients',
          newPatientPayload(account, address),
        );
        const patient = patientCreatedSchema.parse(raw);
        await this.d.booking.setPatient(code, patient.id);
        row = (await this.d.booking.findByCode(code))!;
        ident = {
          status: 'FOUND',
          maBN: patient.id,
          hisFullName: account.fullName,
          hisPhone: account.phone,
          hisBirthYear: account.birthYear,
          hisSex: account.gender,
          hasVisited: false,
          checkedAt: new Date().toISOString(),
        };
      }
      if (row.isNewPatient && row.maBN && ident.status !== 'FOUND') {
        // PostPatients đã tạo từ chính tài khoản này; cache C03 có thể còn NEW_PATIENT.
        ident = {
          status: 'FOUND',
          maBN: row.maBN,
          hisFullName: account.fullName,
          hisPhone: account.phone,
          hisBirthYear: account.birthYear,
          hisSex: account.gender,
          hasVisited: false,
          checkedAt: new Date().toISOString(),
        };
      }
      const current = row;
      const slots = await this.d.catalog.slots(current.facilityCode, current.roomHisId, current.examDate);
      const doctor = current.doctorHisId ?? slots.find((s) => s.id === current.slotHisId)?.doctorId;
      if (!doctor) throw new AppError('BOOKING_DOCTOR_REQUIRED');
      const address = draftId ? await this.d.cache.get<PatientAddress>(addressKey(draftId)) : null;
      const payload = bookingPayload(row, account, ident, address, doctor);
      const path = row.bookingApi === 'PAID' ? 'Booking/PostBooking' : 'Booking/PostBooking_Unpaid';
      const raw = await this.d.his.call<unknown>(row.facilityId, path, payload);
      const booked = bookedSchema.parse(raw);
      const updated = await this.d.booking.setBooked(code, booked.stt!, booked.hisBookingId!);
      const mail = bookingConfirmedMail(toBookingView(updated));
      this.d.mailer.send({ to: account.email, ...mail }).catch(() => this.d.onMailError(code));
      return toBookingView(updated);
    } catch (err) {
      if (isNetwork(err)) {
        await this.d.booking.setStatus(code, 'LOI_HIS', 'HIS_UNAVAILABLE');
        await this.d.booking.enqueueOutbox(
          row,
          row.maBN ? `POST_BOOKING_${row.bookingApi}` : 'POST_PATIENT_AND_BOOKING',
        );
        return this.get(accountId, code);
      }
      if (err instanceof AppError && err.code === 'BOOKING_ALREADY_TODAY') {
        await this.d.booking.setStatus(code, 'DA_HUY', err.code);
      } else {
        await this.d.booking.setStatus(code, 'LOI_HIS', err instanceof AppError ? err.code : 'HIS_ERROR');
      }
      throw err;
    }
  }

  private async requireAddress(draftId: string | undefined, code: string) {
    const address = draftId ? await this.d.cache.get<unknown>(addressKey(draftId)) : null;
    const parsed = patientAddressSchema.safeParse(address);
    if (!parsed.success) throw new AppError('BOOKING_ADDRESS_REQUIRED', `Thiếu địa chỉ cho phiếu ${code}`);
    return parsed.data;
  }

  private async requireAccount(accountId: string) {
    const account = await this.d.accounts(accountId);
    if (!account) throw new AppError('UNAUTHENTICATED');
    return account;
  }
}
