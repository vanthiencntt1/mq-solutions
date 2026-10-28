import { AppError } from '@/lib/domain/errors';
import type { CacheStore, HisGateway } from '@/lib/domain/ports';
import {
  allowedExamDate,
  availableSlot,
  filterSchedules,
  fixedSchedules,
  fixedTimeSlots,
  priceFor,
  type AvailableSlot,
  type Doctor,
  type ExamSchedule,
  type Room,
  type Specialty,
  type CatalogFacility,
  type CatalogFacilityReader,
} from '@/lib/domain/booking/schedule';
import type { ObjectType } from '@/lib/domain/booking/types';
import type { SlotHoldStore } from '@/lib/domain/booking/draft';
import { z } from 'zod';
import {
  locationSchema,
  parseDoctors,
  parseRooms,
  parseSchedules,
  parseSerial,
  parseSlots,
  parseSubjects,
  priceListSchema,
  roomTimeSchema,
  type Location,
} from './his-schemas';

export interface CatalogDeps {
  his: HisGateway;
  cache: CacheStore;
  facilities: CatalogFacilityReader;
  holds: SlotHoldStore;
  now: () => Date;
  keys: {
    hisSubjects(facility: string): string;
    hisDoctors(facility: string): string;
    hisRooms(facility: string, subject: string): string;
    hisCatalog(facility: string, kind: string): string;
    hisSchedules(facility: string, room: string): string;
    hisSlots(facility: string, room: string, date: string): string;
    hisSerial(facility: string, room: string, date: string): string;
    hisPrices(facility: string): string;
  };
  ttl: { catalog: number; schedule: number; serial: number; adminCatalog: number };
}

const locationPaths = {
  cities: 'Cities/GetCities',
  districts: 'Districts/GetDistricts',
  wards: 'Wards/GetWards',
  countries: 'Countries/GetCountries',
  jobs: 'Jobs/GetJobs',
  nations: 'Nations/GetNations',
} as const;
export type LocationKind = keyof typeof locationPaths;

// C09 mục 2: danh mục có bản dự phòng 24 giờ; lịch, khung giờ, STT luôn cần dữ liệu mới.
export class CatalogService {
  constructor(private readonly d: CatalogDeps) {}

  listFacilities() {
    return this.d.facilities.list();
  }

  async facility(code: string): Promise<CatalogFacility> {
    const f = await this.d.facilities.findByCode(code);
    if (!f || f.status === 'INACTIVE') throw new AppError('NOT_FOUND', 'Không tìm thấy cơ sở');
    if (f.status === 'PAUSED') throw new AppError('FACILITY_PAUSED');
    return f;
  }

  async specialties(code: string, q = ''): Promise<Specialty[]> {
    const f = await this.facility(code);
    const rows = await this.read(
      f,
      this.d.keys.hisSubjects(code),
      'Subjects/GetSubjects',
      {},
      parseSubjects,
      this.d.ttl.catalog,
      true,
    );
    const normalized = q
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('vi');
    return rows.filter((s) =>
      s.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi')
        .includes(normalized),
    );
  }

  async rooms(code: string, specialty?: string): Promise<Room[]> {
    const f = await this.facility(code);
    const key = this.d.keys.hisRooms(code, specialty ?? 'all');
    const [all, filtered] = await Promise.all([
      this.read(
        f,
        this.d.keys.hisRooms(code, 'all'),
        'Rooms/GetRooms',
        {},
        parseRooms,
        this.d.ttl.catalog,
        true,
      ),
      specialty
        ? this.read(
            f,
            key,
            'Rooms/GetRoombySubjectID',
            { ID: specialty },
            parseRooms,
            this.d.ttl.catalog,
            true,
          )
        : Promise.resolve(null),
    ]);
    const selected = filtered ?? all;
    const byId = new Map(all.map((r) => [r.id, r]));
    return selected.map((r) => {
      const full = byId.get(r.id) ?? r;
      return { ...full, specialtyHisId: r.specialtyHisId || full.specialtyHisId || specialty || '' };
    });
  }

  async doctors(code: string, specialty?: string): Promise<Doctor[]> {
    const f = await this.facility(code);
    const rows = await this.read(
      f,
      this.d.keys.hisDoctors(code),
      'Doctors/GetDoctors',
      {},
      parseDoctors,
      this.d.ttl.catalog,
      true,
    );
    if (!specialty) return rows;
    const direct = rows.filter((d) => d.specialtyHisId === specialty);
    const unknown = rows.filter((d) => !d.specialtyHisId);
    if (unknown.length === 0) {
      if (direct.length === 0) await this.d.facilities.warnNoDoctors(f.id, specialty);
      return direct;
    }
    // Model Doctor của ApiDatKham không có subject_id: đối chiếu lịch của phòng thuộc khoa.
    const rooms = await this.rooms(code, specialty);
    const schedules = (
      await Promise.all(rooms.map((r) => this.schedules(code, { mode: 'ROOM', room: r.id })))
    ).flat();
    const ids = new Set(schedules.map((s) => s.doctorId));
    const result = [...direct, ...unknown.filter((d) => ids.has(d.id))];
    if (result.length === 0) await this.d.facilities.warnNoDoctors(f.id, specialty);
    return result;
  }

  async schedules(
    code: string,
    selection: { mode: 'ROOM' | 'DOCTOR'; room?: number; doctor?: string },
  ): Promise<ExamSchedule[]> {
    const f = await this.facility(code);
    if (f.health === 'DOWN') throw new AppError('HIS_UNAVAILABLE');
    if (f.scheduleSource === 'FIXED') {
      // Khung cố định gắn theo phòng; chọn theo bác sĩ cần lịch thật trong DMBSKHAMBENH.
      if (selection.mode !== 'ROOM' || !selection.room || !f.fixedSchedule) return [];
      return fixedSchedules(f.fixedSchedule, selection.room, this.d.now(), f.allowSameDay);
    }
    const identity = selection.mode === 'DOCTOR' ? `doctor:${selection.doctor}` : `room:${selection.room}`;
    const today = new Date(`${this.today()}T00:00:00Z`);
    const end = new Date(today.getTime() + 14 * 86_400_000).toISOString().slice(0, 10);
    const rows = await this.read(
      f,
      this.d.keys.hisSchedules(code, identity),
      'Schedules/GetSchedules',
      {
        start_time: this.today().replaceAll('-', ''),
        end_time: end.replaceAll('-', ''),
        room_id: selection.mode === 'ROOM' ? selection.room : 0,
        doctor_id: selection.mode === 'DOCTOR' ? Number(selection.doctor) : 0,
      },
      parseSchedules,
      this.d.ttl.schedule,
      false,
    );
    return filterSchedules(
      rows,
      { mode: selection.mode, roomId: selection.room, doctorId: selection.doctor },
      this.d.now(),
      f.allowSameDay,
    );
  }

  async slots(code: string, room: number, date: string): Promise<AvailableSlot[]> {
    const f = await this.facility(code);
    if (f.health === 'DOWN') throw new AppError('HIS_UNAVAILABLE');
    if (!allowedExamDate(date, this.d.now(), f.allowSameDay)) throw new AppError('VALIDATION_FAILED');
    const [slots, used, schedules] = await Promise.all([
      this.timeSlots(f, room, date),
      this.serial(f, room, date),
      this.schedules(code, { mode: 'ROOM', room }),
    ]);
    const numbers = slots.flatMap((s) => {
      const result: number[] = [];
      for (let n = s.startNumber; n <= s.maxNumber; n += s.numberOfJumps) result.push(n);
      return result;
    });
    const held = await this.d.holds.heldNumbers(code, room, date, numbers);
    const doctorId = schedules.find((s) => s.date === date && s.doctorId)?.doctorId;
    // C05 mục 7: PostBooking_Unpaid cần mã bác sĩ từ lịch phòng; không cho chọn nếu HIS thiếu.
    return slots.map((s) => {
      const available = availableSlot(s, date, new Set(used), new Set(held), this.d.now());
      return doctorId ? { ...available, doctorId } : { ...available, remaining: 0, nextNumber: undefined };
    });
  }

  async prices(code: string, room?: number, date?: string, objectType: ObjectType = 'DICH_VU') {
    const f = await this.facility(code);
    const list = await this.read(
      f,
      this.d.keys.hisPrices(code),
      'PriceList/GetPriceList',
      {},
      (v) => z.array(priceListSchema).parse(v),
      this.d.ttl.catalog,
      true,
    );
    if (!room || !date) return { list };
    const selected = (await this.rooms(code)).find((r) => r.id === room);
    if (!selected) throw new AppError('NOT_FOUND');
    return { list, amount: priceFor(selected, objectType) };
  }

  async locations(code: string, kind: LocationKind, parent?: string): Promise<Location[]> {
    const f = await this.facility(code);
    const rows = await this.read(
      f,
      this.d.keys.hisCatalog(code, kind),
      locationPaths[kind],
      {},
      (v) => z.array(locationSchema).parse(v),
      this.d.ttl.adminCatalog,
      true,
    );
    return rows.filter(
      (r) => !parent || (kind === 'districts' ? r.city_id === parent : r.district_id === parent),
    );
  }

  async isBookingNumberUsed(code: string, room: number, date: string, number: number): Promise<boolean> {
    const f = await this.facility(code);
    try {
      const raw = await this.d.his.call<unknown>(f.id, 'Booking/GetBookingNumber', {
        room_id: room,
        booking_date: date.replaceAll('-', ''),
        booking_number: number,
      });
      if (raw === null) return false;
      z.object({ booking_number: z.coerce.number().int() }).parse(raw);
      return true;
    } catch (err) {
      if (err instanceof AppError && err.code === 'NOT_FOUND') return false;
      throw err;
    }
  }

  private today(): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(this.d.now());
  }

  private async timeSlots(f: CatalogFacility, room: number, date: string) {
    if (f.scheduleSource === 'FIXED') return f.fixedSchedule ? fixedTimeSlots(f.fixedSchedule) : [];
    const key = this.d.keys.hisSlots(f.code, String(room), date);
    const rows = await this.read(
      f,
      key,
      'Rooms/GetRoomTimeSlots',
      { ID: String(room) },
      parseSlots,
      this.d.ttl.schedule,
      false,
    );
    // GetRoomTimes là cấu hình giờ phòng riêng của HIS; parse để chặn dữ liệu hỏng tại biên.
    await this.read(
      f,
      `${key}:room-times`,
      'Rooms/GetRoomTimes',
      { ID: String(room) },
      (v) => z.array(roomTimeSchema).parse(v),
      this.d.ttl.schedule,
      false,
    ).catch((err: unknown) => {
      if (!(err instanceof AppError && err.code === 'NOT_FOUND')) throw err;
    });
    return rows;
  }

  private serial(f: CatalogFacility, room: number, date: string): Promise<number[]> {
    return this.read(
      f,
      this.d.keys.hisSerial(f.code, String(room), date),
      'Booking/Getserialnumber',
      { date: date.replaceAll('-', ''), makp: String(room) },
      parseSerial,
      this.d.ttl.serial,
      false,
    );
  }

  private async read<T>(
    f: CatalogFacility,
    key: string,
    path: string,
    body: unknown,
    parse: (raw: unknown) => T,
    ttl: number,
    catalog: boolean,
  ): Promise<T> {
    const cached = await this.d.cache.get<unknown>(key);
    if (cached !== null) return parse(cached);
    const staleKey = `${key}:stale`;
    if (f.health === 'DOWN') {
      const stale = catalog ? await this.d.cache.get<unknown>(staleKey) : null;
      if (stale !== null) return parse(stale);
      throw new AppError('HIS_UNAVAILABLE');
    }
    try {
      const raw = await this.d.his.call<unknown>(f.id, path, body);
      const value = parse(raw);
      await this.d.cache.set(key, raw, ttl);
      if (catalog) await this.d.cache.set(staleKey, raw, this.d.ttl.adminCatalog);
      return value;
    } catch (err) {
      if (err instanceof AppError && err.code === 'NOT_FOUND') return parse([]);
      const stale = catalog ? await this.d.cache.get<unknown>(staleKey) : null;
      if (stale !== null && err instanceof AppError && ['HIS_UNAVAILABLE', 'HIS_ERROR'].includes(err.code))
        return parse(stale);
      throw err;
    }
  }
}
