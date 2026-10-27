import { z } from 'zod';

const id = z.union([z.string(), z.number(), z.bigint()]).transform(String);
const stt = z.coerce.number().int().positive();

// ApiDatKham BookingInfo và Booking_unpaidInfo dùng tên trường khác nhau (C08 mục 2–3).
export const paidBookingSchema = z.object({
  id,
  idbooking: id.optional(),
  booking_number: stt,
  status: z.coerce.number().int().optional(),
});

export const unpaidBookingSchema = z.object({
  IDDK: id,
  MABN: z.string(),
  NGAY: z.string(),
  SO: stt,
});

export const paidDaySchema = z.array(paidBookingSchema);
export const unpaidDaySchema = z.array(unpaidBookingSchema);
export const cancelResultSchema = z.union([
  z.string().min(1),
  z.number().positive(),
  z.literal(true),
  z.record(z.string(), z.unknown()),
]);
