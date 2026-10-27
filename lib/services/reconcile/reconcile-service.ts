import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import { reconcileBookings, type HisBooking } from '@/lib/domain/payment/reconcile';
import type { HisGateway } from '@/lib/domain/ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type { ReconcileLock, ReconcileQuery, ReconcileRepository } from './types';

const id = z.union([z.string(), z.number(), z.bigint()]).transform(String);
const integer = z.coerce.number().int().nonnegative();
const paidSchema = z.array(
  z.object({
    id,
    idbooking: id.optional(),
    booking_number: integer.optional(),
    amount: integer.optional(),
    status: z.coerce.number().int().optional(),
  }),
);
const unpaidSchema = z.array(
  z.object({
    IDDK: id,
    SO: z.union([z.string(), z.number()]).optional(),
  }),
);

function hisDate(iso: string) {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}
function nextDate(iso: string) {
  return new Date(new Date(`${iso}T00:00:00Z`).getTime() + 86_400_000).toISOString().slice(0, 10);
}

export class ReconcileService {
  constructor(
    private readonly d: {
      repo: ReconcileRepository;
      his: HisGateway;
      lock: ReconcileLock;
      now(): Date;
      notifyMismatch(
        facilityId: string,
        examDate: string,
        issues: number,
        bankDifference: number,
      ): Promise<void>;
    },
  ) {}

  async list(actor: AdminPrincipal, query: ReconcileQuery) {
    this.requireRead(actor);
    if (query.facilityId && actor.facilityIds !== null && !actor.facilityIds.includes(query.facilityId))
      throw new AppError('FORBIDDEN');
    return this.d.repo.list(query, actor.facilityIds);
  }

  facilities(actor: AdminPrincipal) {
    this.requireRead(actor);
    return this.d.repo.facilities(actor.facilityIds);
  }

  async runManual(actor: AdminPrincipal, facilityId: string, examDate: string) {
    this.requireRead(actor);
    if (actor.facilityIds !== null && !actor.facilityIds.includes(facilityId))
      throw new AppError('FORBIDDEN');
    const exists = (await this.d.repo.facilities(actor.facilityIds)).some((item) => item.id === facilityId);
    if (!exists) throw new AppError('NOT_FOUND');
    return this.run(facilityId, examDate);
  }

  async runDue(): Promise<void> {
    const now = this.d.now();
    const localDate = formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    const localMinute = formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'HH:mm');
    for (const facility of await this.d.repo.dueFacilities()) {
      if (!/^\d{2}:\d{2}$/.test(facility.reconcileTime)) continue;
      const scheduled =
        Number(facility.reconcileTime.slice(0, 2)) * 60 + Number(facility.reconcileTime.slice(3));
      const current = Number(localMinute.slice(0, 2)) * 60 + Number(localMinute.slice(3));
      if (current < scheduled || current >= scheduled + 15) continue;
      // C09 mục 4: soát ngày vừa qua và ngày khám kế tiếp; lỗi một cơ sở không chặn cơ sở khác.
      for (const date of [localDate, nextDate(localDate)]) {
        if (await this.d.repo.hasCompleted(facility.id, date)) continue;
        try {
          await this.run(facility.id, date);
        } catch {
          /* run đã ghi SyncLog, job sau có thể thử lại. */
        }
      }
    }
  }

  async run(facilityId: string, examDate: string) {
    const release = await this.d.lock.acquire(facilityId, examDate);
    if (!release) throw new AppError('A07_RECONCILE_BUSY');
    const startedAt = this.d.now();
    try {
      const [web, paid, unpaid, bank] = await Promise.all([
        this.d.repo.bookings(facilityId, examDate),
        this.readPaid(facilityId, examDate),
        this.readUnpaid(facilityId, examDate),
        this.d.repo.bankTotals(facilityId, examDate),
      ]);
      const result = reconcileBookings(web, [...paid, ...unpaid]);
      const finishedAt = this.d.now();
      const batch = await this.d.repo.save({ facilityId, examDate, startedAt, finishedAt, result, bank });
      await this.d.repo.log(
        facilityId,
        true,
        result.actions.length,
        finishedAt.getTime() - startedAt.getTime(),
      );
      // C09 mục 4: cảnh báo chỉ chứa số lượng lệch, không gửi thông tin bệnh nhân qua email.
      if (result.issues.length > 0 || bank.difference !== 0)
        await this.d.notifyMismatch(facilityId, examDate, result.issues.length, bank.difference);
      return batch;
    } catch (cause) {
      const message = cause instanceof AppError ? cause.code : 'INTERNAL';
      await this.d.repo.log(facilityId, false, 0, this.d.now().getTime() - startedAt.getTime(), message);
      throw cause;
    } finally {
      await release();
    }
  }

  private async readPaid(facilityId: string, date: string): Promise<HisBooking[]> {
    let raw: unknown;
    try {
      raw = await this.d.his.call<unknown>(facilityId, 'Booking/GetBookingOfDay', {
        BookingDate: hisDate(date),
      });
    } catch (cause) {
      if (cause instanceof AppError && cause.code === 'NOT_FOUND') return [];
      throw cause;
    }
    return paidSchema.parse(raw).map((row) => ({
      key: row.id,
      bookingId: row.idbooking ?? null,
      kind: 'PAID' as const,
      stt: row.booking_number ?? null,
      amount: row.amount ?? null,
      status: row.status ?? null,
    }));
  }

  private async readUnpaid(facilityId: string, date: string): Promise<HisBooking[]> {
    let raw: unknown;
    try {
      raw = await this.d.his.call<unknown>(facilityId, 'Booking/GetBooking_UnpaidOfDay', {
        BookingDate: hisDate(date),
      });
    } catch (cause) {
      if (cause instanceof AppError && cause.code === 'NOT_FOUND') return [];
      throw cause;
    }
    return unpaidSchema.parse(raw).map((row) => ({
      key: row.IDDK,
      bookingId: row.IDDK,
      kind: 'UNPAID' as const,
      stt: row.SO && /^\d+$/.test(String(row.SO)) ? Number(row.SO) : null,
      amount: null,
      status: null,
    }));
  }

  private requireRead(actor: AdminPrincipal) {
    if (!can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.PAYMENT_READ))
      throw new AppError('FORBIDDEN');
  }
}
