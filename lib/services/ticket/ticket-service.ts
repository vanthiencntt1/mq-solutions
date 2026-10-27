import { formatInTimeZone } from 'date-fns-tz';
import { z } from 'zod';
import { canSelfCancel, cancellationDeadline } from '@/lib/domain/booking/cancel-policy';
import { AppError } from '@/lib/domain/errors';
import type { HisGateway } from '@/lib/domain/ports';
import { maskMaBN, maskName } from '@/lib/utils/format';
import {
  cancelResultSchema,
  paidBookingSchema,
  paidDaySchema,
  unpaidBookingSchema,
  unpaidDaySchema,
} from './his-schemas';
import { signedTicketQr } from './ticket-qr';
import type {
  TicketListItem,
  TicketRepository,
  TicketRow,
  TicketTab,
} from '@/lib/domain/booking/cancel-types';

interface TicketDeps {
  repo: TicketRepository;
  his: HisGateway;
  identity: { resolve(accountId: string, facilityCode: string): Promise<{ maBN?: string }> };
  notify: {
    create(
      accountId: string,
      input: { type: 'CANCELLED' | 'REMIND'; title: string; body: string; link: string },
    ): Promise<void>;
    queueEmail(input: {
      code: 'BOOKING_CANCELLED' | 'BOOKING_REMIND';
      to: string;
      vars: Record<string, string>;
    }): Promise<void>;
  };
  withCancelLock<T>(code: string, action: () => Promise<T>): Promise<T>;
  now(): Date;
  qrSecret: string;
}

export const ticketListQuerySchema = z.object({
  tab: z.enum(['upcoming', 'past', 'cancelled']).default('upcoming'),
  facility: z.string().trim().max(30).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const ticketCodeSchema = z.string().regex(/^MQ[A-Z0-9]{6,24}$/);
export const cancelInputSchema = z.object({ reason: z.string().trim().min(3).max(300) });

const dayIso = (date: Date) => formatInTimeZone(date, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
const dayHis = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`;
const tomorrow = (date: Date) => {
  const d = new Date(`${dayIso(date)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};
export class TicketService {
  constructor(private readonly d: TicketDeps) {}

  async list(
    accountId: string,
    tab: TicketTab,
    facility: string | undefined,
    page: number,
    pageSize: number,
  ) {
    const result = await this.d.repo.list(accountId, tab, facility, dayIso(this.d.now()), page, pageSize);
    const rows: TicketListItem[] = result.rows.map((row) => ({
      code: row.code,
      facilityCode: row.facilityCode,
      facilityName: row.facilityName,
      specialtyName: row.specialtyName,
      roomName: row.roomName,
      examDate: row.examDate,
      slotLabel: row.slotLabel,
      status: row.status,
      stt: row.stt,
      cancelRequest: row.cancelRequest,
    }));
    return { rows, total: result.total };
  }

  async detail(accountId: string, code: string) {
    const row = await this.owned(accountId, code);
    return this.view(row);
  }

  async refreshStt(accountId: string, code: string) {
    const row = await this.owned(accountId, code);
    if (row.status !== 'DA_CO_STT') return this.view(row);
    let stt: number;
    if (row.bookingApi === 'PAID') {
      if (!row.hisBookingId) throw new AppError('BOOKING_HIS_CONFLICT');
      // ApiDatKham GetBookingByID tìm theo idbooking, không theo id web gửi lúc đặt.
      const raw = await this.d.his.call<unknown>(row.facilityId, 'Booking/GetBookingByID', {
        ID: row.hisBookingId,
      });
      const found = paidBookingSchema.parse(raw);
      if (found.id !== row.hisId || found.idbooking !== row.hisBookingId)
        throw new AppError('BOOKING_HIS_CONFLICT');
      stt = found.booking_number;
    } else {
      const ident = await this.d.identity.resolve(accountId, row.facilityCode);
      if (!ident.maBN || ident.maBN !== row.maBN) throw new AppError('IDENTITY_MISMATCH');
      const found = await this.readUnpaidBooking(row, ident.maBN);
      stt = found.SO;
    }
    if (stt !== row.stt) await this.d.repo.updateStt(code, stt);
    return this.view({ ...row, stt });
  }

  async cancel(accountId: string, code: string, reason: string) {
    return this.d.withCancelLock(code, async () => {
      const row = await this.owned(accountId, code);
      if (row.cancelRequest) return { requested: true, ticket: this.view(row) };
      if (row.status !== 'DA_CO_STT' || !row.hisBookingId) throw new AppError('CANCEL_NOT_ALLOWED');
      if (!canSelfCancel(row.examDate, row.cancelCutoff, this.d.now()))
        throw new AppError('CANCEL_NOT_ALLOWED');
      const path = row.bookingApi === 'PAID' ? 'Booking/Delbooking' : 'Booking/Delbooking_Unpaid';
      const body = row.bookingApi === 'PAID' ? { ID: row.hisBookingId } : { IDDK: row.hisBookingId };
      try {
        cancelResultSchema.parse(await this.d.his.call<unknown>(row.facilityId, path, body));
      } catch (err) {
        if (err instanceof AppError && err.code === 'CANCEL_PAID_NOT_ALLOWED') {
          await this.d.repo.requestCancel(code, accountId);
          return { requested: true, ticket: this.view({ ...row, cancelRequest: true }) };
        }
        const alreadyCancelled =
          err instanceof AppError &&
          err.details &&
          typeof err.details === 'object' &&
          'hisCode' in err.details &&
          err.details.hisCode === '-45';
        // ApiDatKham Delbooking_Unpaid trả result=IDDK rõ thay vì 3DES (khác các API khác).
        // HisClient vẫn ném lỗi giải mã; chỉ coi hủy thành công sau khi đọc lại và xác nhận IDDK đã biến mất.
        const confirmedUnpaid =
          row.bookingApi === 'UNPAID' && !(err instanceof AppError) && (await this.unpaidGone(row));
        if (!alreadyCancelled && !confirmedUnpaid) throw err;
      }
      await this.d.repo.confirmCancel(code, 'PATIENT', accountId, reason);
      await this.cancelNotice(row, reason);
      return {
        requested: false,
        ticket: this.view({ ...row, status: row.paidAt ? 'CHO_HOAN_TIEN' : 'DA_HUY', cancelRequest: false }),
      };
    });
  }

  async syncToday(): Promise<void> {
    const date = dayIso(this.d.now());
    const facilities = await this.d.repo.facilitiesForDate(date);
    for (const facility of facilities) await this.syncFacility(facility.id, date);
  }

  async remindTomorrow(): Promise<void> {
    const rows = await this.d.repo.remindCandidates(tomorrow(this.d.now()));
    for (const row of rows) {
      if (!(await this.d.repo.claimReminder(row, this.d.now()))) continue;
      const dateTime = `${dayHis(row.examDate)} ${row.slotLabel}`;
      await this.d.notify.queueEmail({
        code: 'BOOKING_REMIND',
        to: row.email,
        vars: { ngayGio: dateTime, phong: row.roomName, stt: String(row.stt ?? '—') },
      });
    }
  }

  private async syncFacility(facilityId: string, date: string) {
    const started = Date.now();
    let updated = 0;
    try {
      const rows = await this.d.repo.activeForDate(facilityId, date);
      const paid = await this.readPaidDay(facilityId, date);
      const unpaid = await this.readUnpaidDay(facilityId, date);
      for (const row of rows) {
        if (row.bookingApi === 'PAID') {
          const found = paid.find((item) => item.id === row.hisId || item.idbooking === row.hisBookingId);
          if (!found) continue;
          if (found.status === 1) {
            await this.d.repo.markExamined(row.code);
            updated++;
          } else if (found.status === 2) {
            await this.d.repo.confirmCancel(row.code, 'HIS');
            await this.cancelNotice(row, 'Cơ sở đã hủy phiếu khám');
            updated++;
          } else if (found.booking_number !== row.stt) {
            await this.d.repo.updateStt(row.code, found.booking_number);
            updated++;
          }
        } else {
          const found = unpaid.find((item) => item.IDDK === row.hisBookingId && item.MABN === row.maBN);
          if (found && found.SO !== row.stt) {
            await this.d.repo.updateStt(row.code, found.SO);
            updated++;
          }
        }
      }
      await this.d.repo.logSync(facilityId, true, updated, Date.now() - started);
    } catch (err) {
      await this.d.repo.logSync(
        facilityId,
        false,
        updated,
        Date.now() - started,
        err instanceof AppError ? err.code : 'HIS_ERROR',
      );
    }
  }

  private async readPaidDay(facilityId: string, date: string) {
    try {
      return paidDaySchema.parse(
        await this.d.his.call<unknown>(facilityId, 'Booking/GetBookingOfDay', { BookingDate: dayHis(date) }),
      );
    } catch (err) {
      if (err instanceof AppError && err.code === 'NOT_FOUND') return [];
      throw err;
    }
  }

  private async readUnpaidDay(facilityId: string, date: string) {
    try {
      return unpaidDaySchema.parse(
        await this.d.his.call<unknown>(facilityId, 'Booking/GetBooking_UnpaidOfDay', {
          DateTime: dayHis(date),
        }),
      );
    } catch (err) {
      if (err instanceof AppError && err.code === 'NOT_FOUND') return [];
      throw err;
    }
  }

  private async readUnpaidBooking(row: TicketRow, maBN: string) {
    try {
      // C08 mục 3: một số bản HIS trả BookingKiosk từ GetBooking_Unpaid,
      // còn phiếu PostBooking_Unpaid nằm ở DATKHAM. Tra bảng theo ngày khi cần.
      const raw = await this.d.his.call<unknown>(row.facilityId, 'Booking/GetBooking_Unpaid', {
        patient_code: maBN,
        booking_date: row.examDate.replaceAll('-', ''),
      });
      const parsed = unpaidBookingSchema.safeParse(raw);
      if (parsed.success) {
        if (parsed.data.IDDK !== row.hisBookingId || parsed.data.MABN !== maBN)
          throw new AppError('BOOKING_HIS_CONFLICT');
        return parsed.data;
      }
    } catch (err) {
      if (!(err instanceof AppError && err.code === 'NOT_FOUND')) throw err;
    }
    const found = (await this.readUnpaidDay(row.facilityId, row.examDate)).find(
      (item) => item.IDDK === row.hisBookingId && item.MABN === maBN,
    );
    if (!found) throw new AppError('BOOKING_HIS_CONFLICT');
    return found;
  }

  private async cancelNotice(row: TicketRow, reason: string) {
    await this.d.notify.create(row.accountId, {
      type: 'CANCELLED',
      title: 'Phiếu khám đã hủy',
      body: `Phiếu ${row.code} tại ${row.facilityName} đã được hủy.`,
      link: `/tai-khoan/phieu-kham/${row.code}`,
    });
    await this.d.notify.queueEmail({
      code: 'BOOKING_CANCELLED',
      to: row.email,
      vars: {
        lyDo: reason,
        hoanTien: row.paidAt ? 'Yêu cầu hoàn tiền đang được xử lý.' : 'Không phát sinh hoàn tiền.',
      },
    });
  }

  private async unpaidGone(row: TicketRow): Promise<boolean> {
    const ident = await this.d.identity.resolve(row.accountId, row.facilityCode);
    if (!ident.maBN || ident.maBN !== row.maBN) throw new AppError('IDENTITY_MISMATCH');
    // Delbooking_Unpaid trả IDDK rõ, HisClient không giải mã được. Chỉ xác nhận
    // đã hủy sau khi tra lại DATKHAM theo IDDK, tránh dùng kết quả BookingKiosk.
    const rows = await this.readUnpaidDay(row.facilityId, row.examDate);
    return !rows.some((item) => item.IDDK === row.hisBookingId && item.MABN === ident.maBN);
  }

  private async owned(accountId: string, code: string) {
    const row = await this.d.repo.find(code);
    if (!row || row.accountId !== accountId) throw new AppError('NOT_FOUND');
    return row;
  }

  private view(row: TicketRow) {
    const canCancel =
      row.status === 'DA_CO_STT' &&
      !row.cancelRequest &&
      !!row.hisBookingId &&
      canSelfCancel(row.examDate, row.cancelCutoff, this.d.now());
    return {
      code: row.code,
      facilityCode: row.facilityCode,
      facilityName: row.facilityName,
      facilityAddress: row.facilityAddress,
      facilityHotline: row.facilityHotline,
      specialtyName: row.specialtyName,
      doctorName: row.doctorName,
      roomName: row.roomName,
      examDate: row.examDate,
      slotLabel: row.slotLabel,
      objectType: row.objectType,
      payMethod: row.payMethod,
      amount: row.amount,
      isPaid: !!row.paidAt,
      status: row.status,
      stt: row.stt,
      cancelRequest: row.cancelRequest,
      canCancel,
      cancelDeadline: cancellationDeadline(row.examDate, row.cancelCutoff).toISOString(),
      nameMasked: maskName(row.fullName),
      birthYear: row.birthYear,
      maBNMasked: row.maBN ? maskMaBN(row.maBN) : null,
      qrSvg: signedTicketQr(row.code, this.d.qrSecret),
    };
  }
}
