// Kiểu dữ liệu truy vấn nội bộ của repository A10; không kéo service vào tầng hạ tầng.
export type DbReportQuery = {
  from: string;
  to: string;
  period: 'day' | 'week' | 'month';
  facilityId?: string;
};

export type DbBookingRow = {
  period: string;
  facilityId: string;
  facilityName: string;
  specialtyName: string;
  objectType: string;
  payMethod: string;
  bookings: number;
  cancelled: number;
  attended: number;
  hisErrors: number;
};

export type DbRevenueRow = {
  day: string;
  facilityId: string;
  facilityName: string;
  onlineVnd: number;
  refundedVnd: number;
};
