// Kiểu dữ liệu nghiệp vụ đặt khám – khớp enum trong prisma/schema.prisma.

export type ObjectType = 'DICH_VU' | 'BHYT';
export type PayMethod = 'ONLINE' | 'AT_FACILITY';
export type BookingApi = 'PAID' | 'UNPAID';
/** facility.booking_mode – C05 mục 3a */
export type BookingMode = 'SPECIALTY' | 'DOCTOR' | 'BOTH';

/** Kết quả tra hồ sơ tại cơ sở (C03), giữ trong Redis 30 phút. */
export type IdentStatus = 'FOUND' | 'MISMATCH' | 'NEW_PATIENT';

export interface IdentResult {
  status: IdentStatus;
  maBN?: string;
  hisFullName?: string;
  hisBirthYear?: number;
  hisPhone?: string;
  hasVisited?: boolean;
  checkedAt: string;
}
