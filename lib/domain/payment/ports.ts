import type { PaymentQr } from '@/lib/domain/ports';

export interface PaymentFacility {
  id: string;
  code: string;
  payOptions: ('ONLINE' | 'AT_FACILITY')[];
  bankCode: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  webhookKeyRef: string | null;
}

export interface PaymentRecord {
  id: string;
  code: string;
  accountId: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  roomHisId: number;
  examDate: string;
  bookingNumber: number;
  bookingApi: 'PAID' | 'UNPAID';
  payMethod: 'ONLINE' | 'AT_FACILITY';
  appointmentStatus: string;
  paymentStatus: string;
  amount: number;
  createdAt: Date;
  providerTxnId: string | null;
  hisBookingId: string | null;
}

export interface IncomingTransfer {
  facilityId: string;
  orderCode: string | null;
  providerTxnId: string;
  bankRef: string | null;
  amount: number;
  at: Date;
  slotAvailable: boolean;
}

export type RecordTransferResult =
  | { kind: 'duplicate' | 'unmatched' | 'mismatch' | 'refund' }
  | { kind: 'paid'; code: string; bookingApi: 'PAID' | 'UNPAID' };

export interface PaymentRepository {
  facilityByCode(code: string): Promise<PaymentFacility | null>;
  facilityById(id: string): Promise<PaymentFacility | null>;
  find(code: string): Promise<PaymentRecord | null>;
  createForUnpaid(code: string, accountId: string, at: Date): Promise<PaymentRecord>;
  record(input: IncomingTransfer): Promise<RecordTransferResult>;
  expireDue(before: Date, limit: number): Promise<PaymentRecord[]>;
  markExpired(code: string, at: Date): Promise<boolean>;
  completePaymentDue(before: Date, limit: number): Promise<{ id: string; code: string; attempts: number }[]>;
  completePaymentOutbox(code: string): Promise<{ id: string; code: string; attempts: number } | null>;
  completePaymentDone(id: string, code: string): Promise<void>;
  completePaymentFailed(id: string, code: string, attempts: number, error: string): Promise<void>;
}

export interface PaymentHoldStore {
  slotAvailable(row: PaymentRecord): Promise<boolean>;
  release(row: PaymentRecord): Promise<void>;
}

export interface PaymentQrStore {
  get(code: string): Promise<PaymentQr | null>;
  set(code: string, qr: PaymentQr): Promise<void>;
}
