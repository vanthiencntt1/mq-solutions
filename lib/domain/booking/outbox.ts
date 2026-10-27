import { z } from 'zod';

const id = z.union([z.string(), z.number()]).transform(String);

// ApiDatKham trả chữ hoa/thường khác nhau giữa PostBooking và PostBooking_Unpaid.
export const bookedSchema = z
  .object({
    Numerical_order: z.coerce.number().int().positive().optional(),
    Numerical_Order: z.coerce.number().int().positive().optional(),
    Booking_ID: id.optional(),
    id: id.optional(),
  })
  .transform((r) => ({ stt: r.Numerical_order ?? r.Numerical_Order, hisBookingId: r.Booking_ID ?? r.id }))
  .refine((r) => !!r.stt && !!r.hisBookingId);

export const patientCreatedSchema = z.object({ id: id });
export const insuranceCheckSchema = z.object({ result: z.boolean() });

export const existingPaidSchema = z.object({
  id: id,
  booking_number: z.coerce.number().int().positive(),
  idbooking: id.optional(),
});

export const existingUnpaidSchema = z.object({
  IDDK: id,
  MABN: z.string(),
  NGAY: z.string(),
  SO: z.coerce.number().int().positive(),
});
