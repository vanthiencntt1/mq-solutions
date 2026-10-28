import { z } from 'zod';
import type { Doctor, ExamSchedule, Room, Specialty, TimeSlot } from '@/lib/domain/booking/schedule';

const id = z.union([z.string(), z.number()]).transform(String);
const money = z.coerce.number().int().nonnegative();

const subject = z.object({ id, name: z.string().min(1) });
const doctor = z.object({
  id,
  fullname: z.string().optional(),
  name: z.string().optional(),
  role: z.string().nullish(),
  title: z.string().nullish(),
  subject_id: id.optional(),
});
const room = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().min(1),
  subject_id: id.optional(),
  price_dv: money.optional(),
  price_bh: money.optional(),
  price_t7: money.optional(),
  price_cn: money.optional(),
});
const schedule = z.object({
  date_time: z.string().nullish(),
  date: z.string().nullish(),
  room_id: z.coerce.number().int().positive(),
  doctor_id: id.nullish(),
  slot_time: z.string().nullish(),
});
const slot = z.object({
  id: z.coerce.number().int().positive(),
  start_time: z.string(),
  end_time: z.string(),
  startnumber: z.coerce.number().int().nonnegative(),
  maxnumber: z.coerce.number().int().nonnegative(),
  numberofjumps: z.coerce.number().int().positive(),
});

export function parseSubjects(raw: unknown): Specialty[] {
  return z
    .array(subject)
    .parse(raw)
    .map(({ id, name }) => ({ id, name }));
}

export function parseDoctors(raw: unknown): Doctor[] {
  return z
    .array(doctor)
    .parse(raw)
    .map((d) => ({
      id: d.id,
      name: d.fullname ?? d.name ?? '',
      title: d.role ?? d.title ?? undefined,
      specialtyHisId: d.subject_id,
    }))
    .filter((d) => d.name.length > 0);
}

export function parseRooms(raw: unknown): Room[] {
  return z
    .array(room)
    .parse(raw)
    .map((r) => ({
      id: r.id,
      name: r.name,
      specialtyHisId: r.subject_id ?? '',
      priceDv: r.price_dv ?? 0,
      priceBh: r.price_bh ?? 0,
    }));
}

export function parseSchedules(raw: unknown): ExamSchedule[] {
  return z
    .array(schedule)
    .parse(raw)
    .map((s) => {
      const date = s.date_time ?? s.date ?? '';
      return {
        date: /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date,
        roomId: s.room_id,
        doctorId: s.doctor_id ?? undefined,
        slotTime: s.slot_time ?? undefined,
      };
    })
    .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date));
}

export function parseSlots(raw: unknown): TimeSlot[] {
  return z
    .array(slot)
    .parse(raw)
    .map((s) => ({
      id: s.id,
      startTime: s.start_time.slice(0, 5),
      endTime: s.end_time.slice(0, 5),
      startNumber: s.startnumber,
      maxNumber: s.maxnumber,
      numberOfJumps: s.numberofjumps,
    }));
}

export function parseSerial(raw: unknown): number[] {
  return z
    .array(z.object({ Stt: id.optional(), stt: id.optional() }))
    .parse(raw)
    .map((r) => Number(r.Stt ?? r.stt))
    .filter((n) => Number.isInteger(n) && n >= 0);
}

export const locationSchema = z.object({
  id,
  name: z.string().min(1),
  city_id: id.optional(),
  district_id: id.optional(),
});
export type Location = z.infer<typeof locationSchema>;
export const priceListSchema = z.object({ ID: id, Name: z.string(), Price: money });
export const roomTimeSchema = z.object({
  ID: id,
  StartTime: z.string().nullish(),
  EndTime: z.string().nullish(),
});
