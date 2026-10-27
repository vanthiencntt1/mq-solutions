import type { ErrorCode } from '@/lib/domain/errors';

// Ánh xạ mã lỗi ApiDatKham → mã nội bộ (00-CONG-NGHE-QUY-UOC mục 6, C06 mục 4, C08 mục 4).
const HIS_ERROR_MAP: Record<string, ErrorCode> = {
  '2222': 'NOT_FOUND', // PKHNEW MedicalRecords: KhongCoDuLieu khi danh sách rỗng (C04)
  '4014': 'BOOKING_ALREADY_TODAY', // PostBooking_Unpaid: 1 lịch / bệnh nhân / ngày
  '4004': 'BOOKING_PATIENT_INFO_MISMATCH',
  '4005': 'BOOKING_PATIENT_INFO_MISMATCH',
  '-44': 'CANCEL_NOT_ALLOWED', // KhongDuocPhepHuyKhacNgay
  '-46': 'CANCEL_PAID_NOT_ALLOWED', // PhieuDaThanhToanKhongChoHuy
  BookingNumberDaSuDung: 'BOOKING_SLOT_FULL',
  NAMEPATIENT: 'BOOKING_PATIENT_INFO_MISMATCH',
  BIRTHYEAR: 'BOOKING_PATIENT_INFO_MISMATCH',
  SEX: 'BOOKING_PATIENT_INFO_MISMATCH',
  MOBILE: 'BOOKING_PATIENT_INFO_MISMATCH',
};

export function mapHisError(hisCode: string | undefined): ErrorCode {
  if (!hisCode) return 'HIS_ERROR';
  const direct = HIS_ERROR_MAP[hisCode];
  if (direct) return direct;
  const prefix = Object.keys(HIS_ERROR_MAP).find((k) => hisCode.toUpperCase().startsWith(k.toUpperCase()));
  return prefix ? HIS_ERROR_MAP[prefix]! : 'HIS_ERROR';
}
