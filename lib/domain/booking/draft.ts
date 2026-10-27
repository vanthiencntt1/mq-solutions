import { z } from 'zod';

export const bookingDraftInput = z.object({
  id: z.uuid().optional(),
  facilityCode: z.string().regex(/^[A-Za-z0-9_-]{2,30}$/),
  mode: z.enum(['ROOM', 'DOCTOR']),
  specialtyHisId: z.string().min(1).max(80),
  specialtyName: z.string().min(1).max(200),
  doctorHisId: z.string().max(80).optional(),
  doctorName: z.string().max(200).optional(),
  roomHisId: z.number().int().positive(),
  roomName: z.string().min(1).max(200),
  examDate: z.iso.date(),
  slotHisId: z.number().int().positive(),
  slotLabel: z.string().min(1).max(80),
  objectType: z.enum(['DICH_VU', 'BHYT']).default('DICH_VU'),
});

export type BookingDraftInput = z.input<typeof bookingDraftInput>;
export type BookingDraft = z.output<typeof bookingDraftInput> & {
  id: string;
  accountId: string;
  amount: number;
  bookingNumber?: number;
};

export interface SlotHoldStore {
  heldNumbers(facility: string, room: number, date: string, numbers: number[]): Promise<number[]>;
  tryHold(
    facility: string,
    room: number,
    date: string,
    number: number,
    owner: string,
    ttl: number,
  ): Promise<boolean>;
}

export interface BookingRulesReader {
  hasSameDay(accountId: string, facilityId: string, date: string): Promise<boolean>;
  countUnexamined(accountId: string, facilityId: string): Promise<number>;
}
