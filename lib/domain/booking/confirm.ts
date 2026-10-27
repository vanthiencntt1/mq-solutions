import { z } from 'zod';
import type { BookingDraft } from './draft';
import type { AppointmentStatus } from './status';
import type { IdentStatus } from '../identity/types';
import type { BookingApi, ObjectType, PayMethod } from './types';

// C03 mục 5: mã địa giới do HIS của từng cơ sở cấp, không suy ra từ địa chỉ tài khoản.
export const patientAddressSchema = z.object({
  cityId: z.string().min(1).max(30),
  districtId: z.string().min(1).max(30),
  wardId: z.string().min(1).max(30),
  address: z.string().trim().min(1).max(255),
});
export type PatientAddress = z.infer<typeof patientAddressSchema>;

export const confirmInputSchema = z.object({
  draftId: z.uuid(),
  payMethod: z.enum(['ONLINE', 'AT_FACILITY']),
  acceptedTerms: z.literal(true),
});

export interface BookingAccount {
  fullName: string;
  birthYear: number;
  birthDate?: string;
  gender: number;
  phone: string;
  socialId: string;
  email: string;
  addressLine?: string;
}

export interface BookingRecord {
  id: string;
  code: string;
  hisId: bigint;
  accountId: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  maBN: string | null;
  isNewPatient: boolean;
  specialtyHisId: string;
  specialtyName: string;
  doctorHisId: string | null;
  doctorName: string | null;
  roomHisId: number;
  roomName: string;
  examDate: string;
  slotHisId: number | null;
  slotLabel: string;
  bookingNumber: number;
  objectType: ObjectType;
  payMethod: PayMethod;
  bookingApi: BookingApi;
  amount: number;
  status: AppointmentStatus;
  stt: number | null;
  hisBookingId: string | null;
  paidAt: Date | null;
  providerTxnId?: string | null;
  orderCode?: string | null;
}

export interface CreateBookingRecord {
  code: string;
  hisId: bigint;
  accountId: string;
  facilityId: string;
  draft: BookingDraft;
  maBN?: string;
  isNewPatient: boolean;
  payMethod: PayMethod;
  bookingApi: BookingApi;
  status: AppointmentStatus;
}

export interface BookingRepository {
  findByCode(code: string): Promise<BookingRecord | null>;
  hasSameDay(accountId: string, facilityId: string, date: string): Promise<boolean>;
  create(input: CreateBookingRecord): Promise<BookingRecord>;
  setPatient(code: string, maBN: string): Promise<void>;
  setStatus(code: string, status: AppointmentStatus, error?: string): Promise<void>;
  setBooked(code: string, stt: number, hisBookingId: string): Promise<BookingRecord>;
  enqueueOutbox(record: BookingRecord, command: string): Promise<void>;
  dueOutbox(limit: number): Promise<{ id: string; code: string; command: string; attempts: number }[]>;
  finishOutbox(id: string): Promise<void>;
  deferOutbox(id: string, attempts: number, error: string): Promise<void>;
  audit(accountId: string, facilityId: string, code: string): Promise<void>;
}

// Chỉ dữ liệu an toàn được đưa tới trình duyệt.
export interface BookingView {
  code: string;
  facilityName: string;
  specialtyName: string;
  doctorName: string | null;
  roomName: string;
  examDate: string;
  slotLabel: string;
  amount: number;
  objectType: ObjectType;
  payMethod: PayMethod;
  status: AppointmentStatus;
  stt: number | null;
}

export function toBookingView(row: BookingRecord): BookingView {
  return {
    code: row.code,
    facilityName: row.facilityName,
    specialtyName: row.specialtyName,
    doctorName: row.doctorName,
    roomName: row.roomName,
    examDate: row.examDate,
    slotLabel: row.slotLabel,
    amount: row.amount,
    objectType: row.objectType,
    payMethod: row.payMethod,
    status: row.status,
    stt: row.stt,
  };
}

/** Dữ liệu chặng 2–3 trả cho trình duyệt (BookingService.prepare): thông tin bệnh nhân đã che. */
export interface PreparedBooking {
  draft: {
    id: string;
    facilityCode: string;
    facilityName: string;
    specialtyName: string;
    doctorName?: string;
    roomName: string;
    examDate: string;
    slotLabel: string;
    objectType: ObjectType;
    amount: number;
  };
  patient: {
    status: IdentStatus;
    nameMasked: string;
    phoneMasked: string;
    maBNMasked?: string;
    birthYear: number;
    hasVisited: boolean;
  };
  payOptions: PayMethod[];
  address: PatientAddress | null;
}
