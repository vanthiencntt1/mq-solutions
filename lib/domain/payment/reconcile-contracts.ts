import type { ReconcileAction, ReconcileIssue, WebBooking } from './reconcile';

// A07/C09: hợp đồng thuần để hạ tầng không phụ thuộc tầng service.
export interface PaymentQuery {
  page: number;
  pageSize: number;
  facilityId?: string;
  date?: string;
  status?: 'PENDING' | 'PAID' | 'EXPIRED' | 'AMOUNT_MISMATCH' | 'UNMATCHED' | 'REFUND_PENDING' | 'REFUNDED';
}

export interface PaymentRow {
  id: string;
  facilityId: string;
  facilityName: string;
  orderCode: string | null;
  providerTxnId: string | null;
  amount: number;
  paidAmount: number | null;
  status: string;
  appointmentCode: string | null;
  appointmentStatus: string | null;
  refundBy: string | null;
  refundApprovedBy: string | null;
  refundRef: string | null;
  createdAt: Date;
  paidAt: Date | null;
  refundedAt: Date | null;
}

export interface PaymentRepository {
  list(query: PaymentQuery, scope: string[] | null): Promise<{ rows: PaymentRow[]; total: number }>;
  facilities(scope: string[] | null): Promise<{ id: string; name: string }[]>;
  find(id: string, scope: string[] | null): Promise<PaymentRow | null>;
  match(id: string, appointmentCode: string, actorId: string, scope: string[] | null): Promise<PaymentRow>;
  requestRefund(
    id: string,
    amount: number,
    note: string,
    actorId: string,
    scope: string[] | null,
  ): Promise<PaymentRow>;
  refundRequest(id: string): Promise<{ amount: number; note: string } | null>;
  approveRefund(id: string, actorId: string, scope: string[] | null): Promise<PaymentRow>;
  completeRefund(
    id: string,
    input: { refundedAt: Date; refundRef: string; note?: string; amount: number },
    actorId: string,
    scope: string[] | null,
  ): Promise<PaymentRow>;
  refundEmail(id: string, scope: string[] | null): Promise<string | null>;
}

export interface ReconcileFacility {
  id: string;
  name: string;
  reconcileTime: string;
}
export interface BankTotals {
  incoming: number;
  booked: number;
  difference: number;
}
export interface ReconcileBatchView {
  id: string;
  facilityId: string;
  facilityName: string;
  examDate: string;
  matched: number;
  missingInHis: number;
  missingInWeb: number;
  statusChanged: number;
  amountDiff: number;
  issues: ReconcileIssue[];
  bank: BankTotals;
  startedAt: Date;
  finishedAt: Date | null;
}
export interface ReconcileQuery {
  page: number;
  pageSize: number;
  facilityId?: string;
  date?: string;
}
export interface ReconcileRepository {
  dueFacilities(): Promise<ReconcileFacility[]>;
  facilities(scope: string[] | null): Promise<ReconcileFacility[]>;
  alertRecipients(facilityId: string): Promise<string[]>;
  bookings(facilityId: string, examDate: string): Promise<WebBooking[]>;
  bankTotals(facilityId: string, date: string): Promise<BankTotals>;
  save(input: {
    facilityId: string;
    examDate: string;
    startedAt: Date;
    finishedAt: Date;
    result: {
      matched: number;
      missingInHis: number;
      missingInWeb: number;
      statusChanged: number;
      amountDiff: number;
      issues: ReconcileIssue[];
      actions: ReconcileAction[];
    };
    bank: BankTotals;
  }): Promise<ReconcileBatchView>;
  hasCompleted(facilityId: string, date: string): Promise<boolean>;
  list(query: ReconcileQuery, scope: string[] | null): Promise<{ rows: ReconcileBatchView[]; total: number }>;
  log(facilityId: string, ok: boolean, updated: number, durationMs: number, error?: string): Promise<void>;
}
export interface ReconcileLock {
  acquire(facilityId: string, date: string): Promise<(() => Promise<void>) | null>;
}
