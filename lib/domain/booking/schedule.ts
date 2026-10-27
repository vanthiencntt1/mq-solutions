import type { BookingMode, ObjectType } from './types';

export interface Specialty {
  id: string;
  name: string;
}
export interface Doctor {
  id: string;
  name: string;
  title?: string;
  specialtyHisId?: string;
}
export interface Room {
  id: number;
  name: string;
  specialtyHisId: string;
  priceDv: number;
  priceBh: number;
  priceT7: number;
  priceCn: number;
}
export interface ExamSchedule {
  date: string;
  roomId: number;
  doctorId?: string;
  slotTime?: string;
}
export interface TimeSlot {
  id: number;
  startTime: string;
  endTime: string;
  startNumber: number;
  maxNumber: number;
  numberOfJumps: number;
}
export interface AvailableSlot extends TimeSlot {
  label: string;
  remaining: number;
  nextNumber?: number;
  doctorId?: string;
}

export interface CatalogFacility {
  id: string;
  code: string;
  name: string;
  address: string;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  health: string;
  bookingMode: BookingMode;
  allowBhyt: boolean;
  allowSameDay: boolean;
  payOptions: ('ONLINE' | 'AT_FACILITY')[];
}
export interface CatalogFacilityReader {
  findByCode(code: string): Promise<CatalogFacility | null>;
  list(): Promise<CatalogFacility[]>;
  warnNoDoctors(facilityId: string, specialtyHisId: string): Promise<void>;
}

// C05 mục 4: so ngày theo lịch Việt Nam, không phụ thuộc múi giờ của máy chủ.
export function localDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
}

export function allowedExamDate(date: string, now: Date, allowSameDay: boolean, maxDays = 14): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const target = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(target.getTime()) || target.toISOString().slice(0, 10) !== date) return false;
  const today = new Date(`${localDate(now)}T00:00:00Z`);
  const distance = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  return distance >= (allowSameDay ? 0 : 1) && distance <= maxDays;
}

export function filterSchedules(
  schedules: ExamSchedule[],
  selection: { mode: 'ROOM' | 'DOCTOR'; roomId?: number; doctorId?: string },
  now: Date,
  allowSameDay: boolean,
  maxDays = 14,
): ExamSchedule[] {
  return schedules.filter(
    (s) =>
      allowedExamDate(s.date, now, allowSameDay, maxDays) &&
      (selection.mode === 'DOCTOR'
        ? !!selection.doctorId && s.doctorId === selection.doctorId
        : !!selection.roomId && s.roomId === selection.roomId),
  );
}

export function allowedMode(bookingMode: BookingMode, mode: 'ROOM' | 'DOCTOR'): boolean {
  return bookingMode === 'BOTH' || (bookingMode === 'DOCTOR' ? mode === 'DOCTOR' : mode === 'ROOM');
}

export function priceFor(room: Room, date: string, objectType: ObjectType): number {
  if (objectType === 'BHYT') return room.priceBh;
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return day === 6 ? room.priceT7 : day === 0 ? room.priceCn : room.priceDv;
}

export function availableSlot(
  slot: TimeSlot,
  date: string,
  used: ReadonlySet<number>,
  held: ReadonlySet<number>,
  now: Date,
): AvailableSlot {
  const numbers: number[] = [];
  if (slot.numberOfJumps > 0) {
    for (let n = slot.startNumber; n <= slot.maxNumber; n += slot.numberOfJumps) {
      if (!used.has(n) && !held.has(n)) numbers.push(n);
    }
  }
  // C05 mục 4: ngày hiện tại chỉ hiện khung chưa bắt đầu.
  const closed =
    date === localDate(now) && new Date(`${date}T${slot.startTime}:00+07:00`).getTime() <= now.getTime();
  return {
    ...slot,
    label: `${slot.startTime}–${slot.endTime}`,
    remaining: closed ? 0 : numbers.length,
    nextNumber: closed ? undefined : numbers[0],
  };
}
