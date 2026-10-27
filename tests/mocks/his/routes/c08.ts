type Body = Record<string, unknown>;
import { routes as c06Routes } from './c06';

const paid = new Map([
  [
    '123456789',
    { id: '123456789', idbooking: '123456789', booking_number: 18, status: 3, booking_date: '20261028' },
  ],
]);
const unpaid = new Map([['IDDK001', { IDDK: 'IDDK001', MABN: '2600000001', NGAY: '20261028', SO: 27 }]]);
const cancelledUnpaid = new Set<string>();

// C08 mục 3–4: route riêng để mock server ghép khi cần; không sửa server dùng chung.
export const routes: Record<string, (body: Body) => unknown> = {
  'Booking/PostBooking': (body) => {
    const result = c06Routes['Booking/PostBooking']!(body) as {
      id: string;
      Booking_ID: string;
      booking_number: number;
      booking_date: string;
    };
    paid.set(result.id, {
      id: result.id,
      idbooking: result.Booking_ID,
      booking_number: result.booking_number,
      status: 3,
      booking_date: result.booking_date,
    });
    return result;
  },
  'Booking/PostBooking_Unpaid': (body) => {
    const result = c06Routes['Booking/PostBooking_Unpaid']!(body) as {
      Booking_ID: string;
      Numerical_Order: number;
    };
    unpaid.set(result.Booking_ID, {
      IDDK: result.Booking_ID,
      MABN: String(body.patient_code),
      NGAY: String(body.booking_date),
      SO: result.Numerical_Order,
    });
    return result;
  },
  'Booking/GetBookingByID': (body) =>
    [...paid.values()].find((row) => row.idbooking === String(body.ID)) ?? null,
  'Booking/GetBookingOfDay': (body) => {
    const date = String(body.BookingDate ?? '')
      .split('/')
      .reverse()
      .join('');
    return [...paid.values()].filter((row) => !date || row.booking_date === date);
  },
  // ApiDatKham thật tra BOOKINGPKH status=99 ở route này; PostBooking_Unpaid
  // ghi DATKHAM nên phiếu thường được đọc lại qua GetBooking_UnpaidOfDay.
  'Booking/GetBooking_Unpaid': () => null,
  'Booking/GetBooking_UnpaidOfDay': (body) => {
    const date = String(body.DateTime ?? '')
      .split('/')
      .reverse()
      .join('');
    return [...unpaid.values()].filter(
      (row) => (!date || row.NGAY === date) && !cancelledUnpaid.has(row.IDDK),
    );
  },
  'Booking/Delbooking': (body) => {
    if (body.mockScenario === '-46')
      throw Object.assign(new Error('HIS từ chối phiếu đã thanh toán'), { code: '-46' });
    if (body.mockScenario === '-44')
      throw Object.assign(new Error('Không cho hủy khác ngày'), { code: '-44' });
    if (body.mockScenario === '-45') throw Object.assign(new Error('Phiếu đã hủy'), { code: '-45' });
    const row = paid.get(String(body.ID));
    if (!row) return null;
    paid.set(row.id, { ...row, status: 2 });
    return { result: 1 };
  },
  'Booking/Delbooking_Unpaid': (body) => {
    const id = String(body.IDDK);
    cancelledUnpaid.add(id);
    unpaid.delete(id);
    return id;
  },
};
