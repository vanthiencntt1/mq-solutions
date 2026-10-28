import { randomUUID } from 'node:crypto';
import {
  bookingDraftInput,
  type BookingDraft,
  type BookingDraftInput,
  type BookingRulesReader,
  type SlotHoldStore,
} from '@/lib/domain/booking/draft';
import { allowedMode, priceFor } from '@/lib/domain/booking/schedule';
import { AppError } from '@/lib/domain/errors';
import type { CacheStore } from '@/lib/domain/ports';
import type { CatalogService } from './catalog-service';

interface DraftDeps {
  cache: CacheStore;
  holds: SlotHoldStore;
  rules: BookingRulesReader;
  catalog: CatalogService;
  identity: {
    resolve(accountId: string, facilityCode: string): Promise<{ status: string; hasVisited?: boolean }>;
  };
  keys: { draft(id: string): string };
  ttl: { draft: number; slotHold: number };
}

// C05 mục 8: lựa chọn chặng 1 chỉ tồn tại trong Redis, ràng buộc với tài khoản đăng nhập.
export class BookingDraftService {
  constructor(private readonly d: DraftDeps) {}

  async save(accountId: string, input: BookingDraftInput): Promise<BookingDraft> {
    const choice = bookingDraftInput.parse(input);
    const old = choice.id ? await this.load(accountId, choice.id) : null;
    const facility = await this.d.catalog.facility(choice.facilityCode);
    if (!allowedMode(facility.bookingMode, choice.mode)) throw new AppError('VALIDATION_FAILED');
    const [sameDay, activeCount] = await Promise.all([
      this.d.rules.hasSameDay(accountId, facility.id, choice.examDate),
      this.d.rules.countUnexamined(accountId, facility.id),
    ]);
    if (sameDay) throw new AppError('BOOKING_ALREADY_TODAY');
    if (activeCount >= 3) throw new AppError('BOOKING_TOO_MANY_ACTIVE');
    const [specialties, rooms, doctors] = await Promise.all([
      this.d.catalog.specialties(facility.code),
      this.d.catalog.rooms(facility.code, choice.specialtyHisId),
      choice.mode === 'DOCTOR'
        ? this.d.catalog.doctors(facility.code, choice.specialtyHisId)
        : Promise.resolve([]),
    ]);
    const specialty = specialties.find((s) => s.id === choice.specialtyHisId);
    const room = rooms.find((r) => r.id === choice.roomHisId);
    const doctor = choice.mode === 'DOCTOR' ? doctors.find((d) => d.id === choice.doctorHisId) : undefined;
    if (!specialty || !room || (choice.mode === 'DOCTOR' && !doctor)) throw new AppError('VALIDATION_FAILED');
    const schedules = await this.d.catalog.schedules(
      facility.code,
      choice.mode === 'DOCTOR'
        ? { mode: 'DOCTOR', doctor: choice.doctorHisId }
        : { mode: 'ROOM', room: room.id },
    );
    if (!schedules.some((s) => s.date === choice.examDate && s.roomId === room.id))
      throw new AppError('VALIDATION_FAILED');
    const slot = (await this.d.catalog.slots(facility.code, room.id, choice.examDate)).find(
      (s) => s.id === choice.slotHisId && s.remaining > 0,
    );
    if (!slot) throw new AppError('BOOKING_SLOT_FULL');
    if (choice.objectType === 'BHYT') {
      if (!facility.allowBhyt) throw new AppError('BOOKING_BHYT_NOT_ALLOWED');
      const ident = await this.d.identity.resolve(accountId, facility.code);
      if (ident.status !== 'FOUND' || !ident.hasVisited) throw new AppError('BOOKING_BHYT_NOT_ALLOWED');
    }
    const draft: BookingDraft = {
      ...choice,
      id: old?.id ?? randomUUID(),
      accountId,
      specialtyName: specialty.name,
      roomName: room.name,
      doctorName: doctor?.name,
      slotLabel: slot.label,
      amount: priceFor(room, choice.objectType),
    };
    await this.d.cache.set(this.d.keys.draft(draft.id), draft, this.d.ttl.draft);
    return draft;
  }

  async load(accountId: string, id: string): Promise<BookingDraft | null> {
    const draft = await this.d.cache.get<BookingDraft>(this.d.keys.draft(id));
    if (!draft) return null;
    if (draft.accountId !== accountId) throw new AppError('NOT_FOUND');
    return draft;
  }

  async hold(accountId: string, id: string): Promise<BookingDraft> {
    const draft = await this.load(accountId, id);
    if (!draft) throw new AppError('NOT_FOUND');
    if (draft.bookingNumber) return draft;
    const facility = await this.d.catalog.facility(draft.facilityCode);
    if (await this.d.rules.hasSameDay(accountId, facility.id, draft.examDate))
      throw new AppError('BOOKING_ALREADY_TODAY');
    const slots = await this.d.catalog.slots(draft.facilityCode, draft.roomHisId, draft.examDate);
    const slot = slots.find((s) => s.id === draft.slotHisId);
    if (!slot || slot.remaining === 0 || slot.nextNumber === undefined)
      throw new AppError('BOOKING_SLOT_FULL');
    // C05 mục 6: HIS có thể vừa cấp STT sau lúc cache 60 giây; kiểm tra lại từng ứng viên.
    for (let number = slot.nextNumber; number <= slot.maxNumber; number += slot.numberOfJumps) {
      if (
        await this.d.catalog.isBookingNumberUsed(draft.facilityCode, draft.roomHisId, draft.examDate, number)
      )
        continue;
      const acquired = await this.d.holds.tryHold(
        draft.facilityCode,
        draft.roomHisId,
        draft.examDate,
        number,
        draft.id,
        this.d.ttl.slotHold,
      );
      if (!acquired) continue;
      const updated = { ...draft, bookingNumber: number };
      await this.d.cache.set(this.d.keys.draft(id), updated, this.d.ttl.draft);
      return updated;
    }
    throw new AppError('BOOKING_SLOT_FULL');
  }
}
