import { z } from 'zod';

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema.optional());
export const ReconcileQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  facilityId: optional(z.uuid()),
  date: optional(z.iso.date()),
});
export type ReconcileQuery = z.infer<typeof ReconcileQuerySchema>;
export const RunReconcileSchema = z.object({ facilityId: z.uuid(), examDate: z.iso.date() });

export type {
  BankTotals,
  ReconcileBatchView,
  ReconcileFacility,
  ReconcileLock,
  ReconcileRepository,
} from '@/lib/domain/payment/reconcile-contracts';
