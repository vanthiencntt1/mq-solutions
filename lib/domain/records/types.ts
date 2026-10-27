import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';

// Chỉ chọn trường cần hiển thị từ HIS; phần còn lại có thể chứa thông tin hành chính nhạy cảm (C04 mục 4).
const field = z
  .string()
  .nullish()
  .transform((v) => v ?? '');
const code = z.union([z.string(), z.number()]).transform(String);
const dateField = z.string().min(8);

export const EncounterHis = z.object({
  EncounterCode: code,
  CreateDate: dateField,
  RoomName: field,
  DoctorName: field,
  ICDName: field,
});
export const TestHis = z.object({
  PatientCode: code.optional(),
  EncounterCode: code,
  ReturnDate: dateField,
  SymptonName: field,
  ResultName: field,
  Result: field,
  Unit: field,
  UsualIndex: field,
  Note: field,
  Base64String: field,
});
export const ImagingHis = z.object({
  PatientCode: code.optional(),
  EncounterCode: code,
  CreateDate: dateField,
  Name: field,
  Description: field,
  Conclusion: field,
  Base64String: field,
});
export const PrescriptionHis = z.object({
  Name: field,
  Quantity: field,
  Type: field,
  Dosage: field,
  CreateDate: field,
});
export const ReexamHis = z.object({
  PatientCode: code.optional(),
  ReexaminationDate: dateField,
  SubjectID: field,
  RoomID: field,
});

export const FacilityCode = z.string().regex(/^[A-Za-z0-9_-]{2,20}$/);
export const Mmyy = z.string().regex(/^(0[1-9]|1[0-2])\d{2}$/);
export const IsoDate = z.iso.date();
export const EncounterId = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/);

export interface DateRange {
  from: string;
  to: string;
}

/** Dạng hồ sơ tối thiểu được phép trả cho trình duyệt (C04 mục 3, 5). */
export type Encounter = { id: string; date: string; room: string; doctor: string; diagnosis: string };
export type Test = {
  encounterId: string;
  date: string;
  name: string;
  result: string;
  unit: string;
  reference: string;
  abnormal: boolean;
  fileUrl?: string;
};
export type Imaging = {
  encounterId: string;
  date: string;
  name: string;
  description: string;
  conclusion: string;
  fileUrl?: string;
};
export type Prescription = {
  encounterId: string;
  date: string;
  name: string;
  quantity: string;
  form: string;
  dosage: string;
};
export type Reexam = { date: string; specialtyCode: string; roomCode: string };
export type EncounterDetail = Encounter & {
  tests: Test[];
  imaging: Imaging[];
  prescriptions: Prescription[];
};

export const toHisDate = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
export function fromHisDate(value: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(value);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : value.slice(0, 10);
}

/** Giới hạn một lần tra ≤ 12 tháng, kể cả khi URL bị sửa thủ công (C04 mục 5). */
export function parseDateRange(input: { from?: string; to?: string }, now: Date): DateRange {
  const today = now.toISOString().slice(0, 10);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1))
    .toISOString()
    .slice(0, 10);
  const from = IsoDate.parse(input.from ?? start);
  const to = IsoDate.parse(input.to ?? today);
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  const twelveMonthsLater = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 12, a.getUTCDate()));
  if (a > b || b >= twelveMonthsLater)
    throw new AppError('VALIDATION_FAILED', 'Khoảng tra cứu tối đa 12 tháng');
  return { from, to };
}

export function monthsInRange({ from, to }: DateRange): string[] {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  const months: string[] = [];
  for (
    let y = a.getUTCFullYear(), m = a.getUTCMonth();
    y < b.getUTCFullYear() || (y === b.getUTCFullYear() && m <= b.getUTCMonth());
    m++
  ) {
    if (m === 12) {
      y++;
      m = 0;
    }
    months.push(`${String(m + 1).padStart(2, '0')}${String(y).slice(-2)}`);
  }
  return months;
}
