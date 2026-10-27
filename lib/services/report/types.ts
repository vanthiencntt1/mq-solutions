import { z } from 'zod';

const dateString = z.iso.date();

// A10 mục 2: chặn khoảng quá dài trước khi chạy truy vấn tổng hợp.
export const ReportQuerySchema = z
  .object({
    from: dateString,
    to: dateString,
    period: z.enum(['day', 'week', 'month']).default('day'),
    facilityId: z.uuid().optional(),
  })
  .superRefine((value, context) => {
    const days = (Date.parse(value.to) - Date.parse(value.from)) / 86_400_000;
    if (days < 0 || days > 365)
      context.addIssue({ code: 'custom', message: 'Khoảng báo cáo tối đa 366 ngày', path: ['to'] });
  });

export type ReportQuery = z.infer<typeof ReportQuerySchema>;

export interface BookingRow {
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
}

export interface RevenueRow {
  day: string;
  facilityId: string;
  facilityName: string;
  onlineVnd: number;
  refundedVnd: number;
}

export interface FacilityHealth {
  id: string;
  code: string;
  name: string;
  health: string;
  lastOkAt: string | null;
  latencyMs: number | null;
  checks: number;
  errors: number;
  errorRate: number;
  outboxPending: number;
}

export interface DashboardStats {
  newBookings: number;
  examsToday: number;
  onlineBookings: number;
  atFacilityBookings: number;
  onlineVnd: number;
  hisErrors: number;
  hisErrorRate: number;
  tasks: {
    staleHis: number;
    cancelRequests: number;
    refundPending: number;
    paymentMismatch: number;
    patientInfoMismatch: number;
    reconcileMismatch: number;
    outboxPending: number;
  };
}

export interface ReportRepository {
  bookings(query: ReportQuery, scope: string[] | null): Promise<BookingRow[]>;
  revenue(query: ReportQuery, scope: string[] | null): Promise<RevenueRow[]>;
  facilities(scope: string[] | null): Promise<{ id: string; name: string }[]>;
  health(scope: string[] | null, since: Date): Promise<FacilityHealth[]>;
  dashboard(scope: string[] | null, start: Date, end: Date, now: Date): Promise<DashboardStats>;
}

export interface ReportResult {
  query: ReportQuery;
  facilities: { id: string; name: string }[];
  bookings: BookingRow[];
  revenue: RevenueRow[];
  totals: {
    bookings: number;
    cancelled: number;
    attended: number;
    hisErrors: number;
    cancellationRate: number;
    attendanceRate: number;
    hisErrorRate: number;
    onlineVnd: number;
    refundedVnd: number;
  };
}

export type DashboardResult = DashboardStats & { health: FacilityHealth[] };

export interface ReportCache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
}
