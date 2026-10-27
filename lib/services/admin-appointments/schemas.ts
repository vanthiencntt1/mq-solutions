import { z } from 'zod';

const optional = (schema: z.ZodType<string>) =>
  z
    .union([schema, z.literal('')])
    .optional()
    .transform((value) => value || undefined);

export const AppointmentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  facilityId: optional(z.uuid()),
  date: optional(z.iso.date()),
  specialty: optional(z.string().trim().min(1).max(100)),
  status: optional(
    z.enum([
      'CHO_THANH_TOAN',
      'QUA_HAN',
      'DA_THANH_TOAN',
      'DANG_GUI_HIS',
      'LOI_HIS',
      'DA_CO_STT',
      'DA_KHAM',
      'DA_HUY',
      'CHO_HOAN_TIEN',
      'DA_HOAN_TIEN',
    ]),
  ),
  payMethod: optional(z.enum(['ONLINE', 'AT_FACILITY'])),
  bookingApi: optional(z.enum(['PAID', 'UNPAID'])),
  hasHisError: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  code: optional(z.string().trim().min(1).max(32)),
});
export type AppointmentQuery = z.infer<typeof AppointmentQuerySchema>;

export const AppointmentCodeSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^MQ[A-Z0-9]{6,24}$/),
});
export const AppointmentActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('retry') }),
  z.object({ action: z.literal('resend') }),
  z.object({ action: z.literal('cancel'), note: z.string().trim().min(5).max(500) }),
  z.object({ action: z.literal('note'), note: z.string().trim().min(2).max(1000) }),
  z.object({ action: z.literal('confirm-cancel'), note: z.string().trim().min(5).max(500) }),
  z.object({
    action: z.literal('set-stt'),
    stt: z.number().int().positive().max(99999),
    hisBookingId: z.string().trim().min(1).max(80),
  }),
]);
export type AppointmentAction = z.infer<typeof AppointmentActionSchema>;

export const CheckInLookupSchema = z
  .object({
    token: z.string().trim().min(1).max(300).optional(),
    code: z.string().trim().min(1).max(32).optional(),
  })
  .refine((value) => !!value.token || !!value.code);
