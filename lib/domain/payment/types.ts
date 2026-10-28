import { z } from 'zod';
import type { PaymentQr } from '@/lib/domain/ports';

export interface PaymentView {
  code: string;
  facilityName: string;
  amount: number;
  paymentStatus: string;
  appointmentStatus: string;
  expiresAt: string;
  qr: Omit<PaymentQr, 'expiresAt'> | null;
  /** Cổng nhận tiền của cơ sở: SEPAY | PAYOS. */
  provider: string;
}

export const appointmentCodeSchema = z.string().regex(/^MQ[A-F0-9]{10}$/);
export const facilityCodeSchema = z.string().regex(/^[A-Za-z0-9_-]{2,30}$/);

// C07 mục 3: chỉ nhận dữ liệu giao dịch vào, giữ mã và số tiền nguyên VND.
export const sepayWebhookSchema = z.object({
  id: z.union([z.number().int().nonnegative(), z.string().min(1).max(80)]),
  accountNumber: z.string().min(1).max(50),
  content: z.string().max(1000),
  code: z.string().nullable().optional(),
  transferType: z.enum(['in', 'out']),
  transferAmount: z.number().int().positive().safe(),
  referenceCode: z.string().max(100).nullable().optional(),
});

export type SepayWebhook = z.infer<typeof sepayWebhookSchema>;

export function orderCodeIn(content: string, code?: string | null): string | null {
  const match = content.toUpperCase().match(/(?:^|[^A-Z0-9])(MQ[A-F0-9]{10})(?![A-Z0-9])/);
  if (match) return match[1] ?? null;
  const parsed = appointmentCodeSchema.safeParse(code?.toUpperCase());
  return parsed.success ? parsed.data : null;
}

export function paymentDeadline(createdAt: Date): Date {
  return new Date(createdAt.getTime() + 15 * 60_000);
}

// C07 mục 3–4: thiếu/thừa đều cần kế toán xử lý; tiền muộn chỉ nhận nếu số cũ còn trống.
export function classifyTransfer(expected: number, received: number, slotAvailable: boolean) {
  if (expected !== received) return 'mismatch' as const;
  if (!slotAvailable) return 'refund' as const;
  return 'paid' as const;
}

// ===== PayOS =====
// PayOS bắt buộc orderCode là số nguyên. Mã phiếu MQ + 10 số hex = 40 bit, đổi qua lại không cần bảng phụ.
export function payosOrderCodeOf(code: string): number {
  const parsed = appointmentCodeSchema.parse(code);
  return Number.parseInt(parsed.slice(2), 16);
}

export function codeOfPayosOrder(orderCode: number): string | null {
  if (!Number.isSafeInteger(orderCode) || orderCode < 0 || orderCode > 0xff_ffff_ffff) return null;
  return `MQ${orderCode.toString(16).toUpperCase().padStart(10, '0')}`;
}

export const payosWebhookSchema = z.object({
  code: z.string(),
  desc: z.string().optional(),
  success: z.boolean().optional(),
  data: z
    .object({
      orderCode: z.number().int().nonnegative().safe(),
      amount: z.number().int().nonnegative().safe(),
      reference: z.string().max(100).nullable().optional(),
      paymentLinkId: z.string().max(100).nullable().optional(),
      code: z.string().optional(),
    })
    .loose(),
  signature: z.string().regex(/^[a-f0-9]{64}$/i),
});

export type PayosWebhook = z.infer<typeof payosWebhookSchema>;
