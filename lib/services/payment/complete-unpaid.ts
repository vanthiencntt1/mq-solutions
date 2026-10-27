import { z } from 'zod';
import type { BookingRepository } from '@/lib/domain/booking/confirm';
import { AppError } from '@/lib/domain/errors';
import type { HisGateway } from '@/lib/domain/ports';
import type { BookingAccount } from '@/lib/domain/booking/confirm';
import type { CatalogService } from '@/lib/services/catalog/catalog-service';
import type { IdentResult } from '@/lib/domain/identity/types';
import { bookingPayload } from '@/lib/services/booking/his-payload';
import { existingUnpaidSchema } from '@/lib/domain/booking/outbox';

interface CompleteDeps {
  booking: BookingRepository;
  accounts(accountId: string): Promise<BookingAccount | null>;
  identity: { resolve(accountId: string, facilityCode: string): Promise<IdentResult> };
  catalog: CatalogService;
  his: HisGateway;
}

const completeResponse = z.object({ id: z.union([z.string(), z.number()]) });

// C07 và ApiDatKham PKHNEW/Booking/CompletePayment: gửi lại thông tin HIS từ server.
export function completeUnpaidBooking(d: CompleteDeps) {
  return async (code: string): Promise<void> => {
    const row = await d.booking.findByCode(code);
    if (
      !row ||
      row.bookingApi !== 'UNPAID' ||
      !row.paidAt ||
      !row.providerTxnId ||
      !row.maBN ||
      !row.hisBookingId
    )
      throw new AppError('PAYMENT_NOT_AVAILABLE');
    const [account, ident, slots] = await Promise.all([
      d.accounts(row.accountId),
      d.identity.resolve(row.accountId, row.facilityCode),
      d.catalog.slots(row.facilityCode, row.roomHisId, row.examDate),
    ]);
    if (!account) throw new AppError('UNAUTHENTICATED');
    const doctor = row.doctorHisId ?? slots.find((slot) => slot.id === row.slotHisId)?.doctorId;
    if (!doctor) throw new AppError('BOOKING_DOCTOR_REQUIRED');
    // 00-CONG-NGHE-QUY-UOC mục 8: tra lịch hiện có trước khi gửi lại lệnh ghi HIS.
    const existing = existingUnpaidSchema.parse(
      await d.his.call<unknown>(row.facilityId, 'Booking/GetBooking_Unpaid', {
        patient_code: row.maBN,
        booking_date: row.examDate.replaceAll('-', ''),
      }),
    );
    if (
      existing.IDDK !== row.hisBookingId ||
      existing.MABN !== row.maBN ||
      existing.NGAY !== row.examDate.replaceAll('-', '')
    )
      throw new AppError('BOOKING_HIS_CONFLICT');
    const payload = bookingPayload(row, account, ident, null, doctor);
    const raw = await d.his.call<unknown>(row.facilityId, 'Booking/CompletePayment', {
      ...payload,
      amount: row.amount,
      transaction_code_tt: row.providerTxnId,
      transaction_code_gd: code,
    });
    completeResponse.parse(raw);
  };
}
