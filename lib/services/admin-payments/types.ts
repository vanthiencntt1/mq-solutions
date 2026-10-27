import { z } from 'zod';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === '' ? undefined : value), schema.optional());

export const PaymentQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  facilityId: optional(z.uuid()),
  date: optional(z.iso.date()),
  status: optional(
    z.enum(['PENDING', 'PAID', 'EXPIRED', 'AMOUNT_MISMATCH', 'UNMATCHED', 'REFUND_PENDING', 'REFUNDED']),
  ),
});
export type PaymentQuery = z.infer<typeof PaymentQuerySchema>;

export const PaymentIdSchema = z.object({ id: z.uuid() });
export const MatchPaymentSchema = z.object({ appointmentCode: z.string().trim().min(4).max(40) });
export const RefundRequestSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().trim().min(3).max(500),
});
export const RefundCompleteSchema = z.object({
  refundedAt: z.iso.datetime({ offset: true }),
  refundRef: z.string().trim().min(3).max(100),
  note: z.string().trim().max(500).optional(),
});

export type { PaymentRepository, PaymentRow } from '@/lib/domain/payment/reconcile-contracts';
