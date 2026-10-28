import { z } from 'zod';
import type { BookingMode, ObjectType } from './types';

// Nguồn lịch khám của cơ sở:
//  HIS   – ngày khám đọc từ DMBSKHAMBENH, khung giờ từ btdkp_thoigiankham (qua ApiDatKham).
//  FIXED – web tự vẽ khung giờ cố định theo cấu hình dưới; STT vẫn lấy số nhỏ nhất HIS chưa dùng.
export type ScheduleSource = 'HIS' | 'FIXED';

// Chỉ nhận khám từ Thứ 2 đến Thứ 6 (getUTCDay: 1..5).
const isWeekdayNumber = (day: number) => day >= 1 && day <= 5;

/** Ngày YYYY-MM-DD có rơi vào Thứ 2 – Thứ 6 không. */
export function isWeekday(date: string): boolean {
  return isWeekdayNumber(new Date(`${date}T00:00:00Z`).getUTCDay());
}

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Giờ dạng HH:mm');
const hisCode = z.string().trim().regex(/^\d{1,10}$/, 'Mã HIS chỉ gồm chữ số');

export const fixedScheduleSchema = z
  .object({
    // Thứ trong tuần cho đặt: 1 = Thứ 2 … 5 = Thứ 6. Cấu hình cũ còn T7/CN (6/0) được bỏ khi đọc.
    weekdays: z.preprocess(
      (v) => (Array.isArray(v) ? v.filter((d) => typeof d !== 'number' || isWeekdayNumber(d)) : v),
      z
        .array(z.number().int().min(1).max(5))
        .min(1)
        .max(5)
        .refine((v) => new Set(v).size === v.length, 'Thứ bị trùng'),
    ),
    slots: z
      .array(
        z
          .object({
            start: hhmm,
            end: hhmm,
            fromNumber: z.number().int().min(1).max(9999),
            toNumber: z.number().int().min(1).max(9999),
          })
          .refine((s) => s.start < s.end, 'Giờ bắt đầu phải trước giờ kết thúc')
          .refine((s) => s.fromNumber <= s.toNumber, 'Số bắt đầu phải ≤ số cuối'),
      )
      .min(1)
      .max(12),
    // PostBooking_Unpaid bắt buộc mã bác sĩ (lỗi 4010): bác sĩ mặc định + bác sĩ riêng theo phòng
    doctorId: hisCode,
    roomDoctors: z.record(z.string().regex(/^\d{1,10}$/), hisCode).default({}),
  })
  .refine((v) => {
    const ranges = [...v.slots].sort((a, b) => a.fromNumber - b.fromNumber);
    return ranges.every((s, i) => i === 0 || s.fromNumber > ranges[i - 1]!.toNumber);
  }, 'Dải số của các khung giờ không được chồng nhau');

export type FixedSchedule = z.infer<typeof fixedScheduleSchema>;

export const defaultFixedSchedule: FixedSchedule = {
  weekdays: [1, 2, 3, 4, 5],
  slots: [{ start: '07:00', end: '16:00', fromNumber: 1, toNumber: 200 }],
  doctorId: '',
  roomDoctors: {},
};

/** Đọc cấu hình FIXED đã lưu; null nếu thiếu hoặc hỏng (khi đó cơ sở không có lịch). */
export function parseFixedSchedule(raw: unknown): FixedSchedule | null {
  const parsed = fixedScheduleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

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
  scheduleSource?: ScheduleSource;
  fixedSchedule?: FixedSchedule | null;
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
  if (!isWeekday(date)) return false;
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

/** Chế độ FIXED: mọi ngày hợp lệ trong 14 ngày tới rơi vào thứ được cấu hình. */
export function fixedSchedules(
  config: FixedSchedule,
  roomId: number,
  now: Date,
  allowSameDay: boolean,
  maxDays = 14,
): ExamSchedule[] {
  const today = new Date(`${localDate(now)}T00:00:00Z`);
  const doctorId = config.roomDoctors[String(roomId)] ?? config.doctorId;
  const result: ExamSchedule[] = [];
  for (let i = allowSameDay ? 0 : 1; i <= maxDays; i++) {
    const day = new Date(today.getTime() + i * 86_400_000);
    if (!isWeekdayNumber(day.getUTCDay()) || !config.weekdays.includes(day.getUTCDay())) continue;
    result.push({ date: day.toISOString().slice(0, 10), roomId, doctorId: doctorId || undefined });
  }
  return result;
}

/** Chế độ FIXED: khung giờ do web vẽ; id khung = thứ tự 1..n để lưu vào slotHisId. */
export function fixedTimeSlots(config: FixedSchedule): TimeSlot[] {
  return config.slots.map((s, i) => ({
    id: i + 1,
    startTime: s.start,
    endTime: s.end,
    startNumber: s.fromNumber,
    maxNumber: s.toNumber,
    numberOfJumps: 1,
  }));
}

export function allowedMode(bookingMode: BookingMode, mode: 'ROOM' | 'DOCTOR'): boolean {
  return bookingMode === 'BOTH' || (bookingMode === 'DOCTOR' ? mode === 'DOCTOR' : mode === 'ROOM');
}

// Chỉ khám T2–T6 nên không còn giá Thứ 7 / Chủ nhật.
export function priceFor(room: Room, objectType: ObjectType): number {
  return objectType === 'BHYT' ? room.priceBh : room.priceDv;
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
