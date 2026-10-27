import type { AppointmentStatus } from '@/lib/domain/booking/status';
import type { BookingApi, ObjectType, PayMethod } from '@/lib/domain/booking/types';

export type TicketTab = 'upcoming' | 'past' | 'cancelled';

export interface TicketRow {
  id: string;
  code: string;
  accountId: string;
  facilityId: string;
  facilityCode: string;
  facilityName: string;
  facilityAddress: string;
  facilityHotline: string | null;
  cancelCutoff: string;
  maBN: string | null;
  fullName: string;
  birthYear: number;
  email: string;
  specialtyName: string;
  doctorName: string | null;
  roomName: string;
  examDate: string;
  slotLabel: string;
  objectType: ObjectType;
  payMethod: PayMethod;
  bookingApi: BookingApi;
  amount: number;
  status: AppointmentStatus;
  stt: number | null;
  hisId: string;
  hisBookingId: string | null;
  paidAt: Date | null;
  cancelRequest: boolean;
}

export interface TicketRepository {
  list(
    accountId: string,
    tab: TicketTab,
    facilityCode: string | undefined,
    today: string,
    page: number,
    pageSize: number,
  ): Promise<{ rows: TicketRow[]; total: number }>;
  find(code: string): Promise<TicketRow | null>;
  updateStt(code: string, stt: number): Promise<void>;
  requestCancel(code: string, accountId: string): Promise<void>;
  confirmCancel(code: string, actorType: 'PATIENT' | 'HIS', actorId?: string, reason?: string): Promise<void>;
  facilitiesForDate(date: string): Promise<{ id: string; code: string }[]>;
  activeForDate(facilityId: string, date: string): Promise<TicketRow[]>;
  markExamined(code: string): Promise<void>;
  logSync(
    facilityId: string,
    ok: boolean,
    updated: number,
    durationMs: number,
    error?: string,
  ): Promise<void>;
  remindCandidates(date: string): Promise<TicketRow[]>;
  claimReminder(row: TicketRow, now: Date): Promise<boolean>;
}

export interface TicketListItem {
  code: string;
  facilityCode: string;
  facilityName: string;
  specialtyName: string;
  roomName: string;
  examDate: string;
  slotLabel: string;
  status: AppointmentStatus;
  stt: number | null;
  cancelRequest: boolean;
}

export interface TicketDetailView extends TicketListItem {
  facilityAddress: string;
  facilityHotline: string | null;
  doctorName: string | null;
  objectType: ObjectType;
  payMethod: PayMethod;
  amount: number;
  isPaid: boolean;
  canCancel: boolean;
  cancelDeadline: string;
  nameMasked: string;
  birthYear: number;
  maBNMasked: string | null;
  qrSvg: string;
}
