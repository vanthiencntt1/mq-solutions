import { PATIENTS } from '../data';

type Body = Record<string, unknown>;
type BookingMock = {
  id: string;
  patient_code: string;
  booking_date: string;
  booking_number: number;
  Booking_ID: string;
};
const patients = new Map(PATIENTS.map((p) => [String(p.id), p]));
const bookings = new Map<string, BookingMock>();
let patientNumber = 1;

const scenario = (body: Body) => {
  if (body.mockScenario === 'timeout') throw Object.assign(new Error('Timeout'), { code: 'HIS_UNAVAILABLE' });
  if (body.mockScenario === '4014') throw Object.assign(new Error('Đã đặt trong ngày'), { code: '4014' });
  if (body.mockScenario === 'mismatch')
    throw Object.assign(new Error('Thông tin lệch'), { code: 'NAMEPATIENT' });
};

// C06: dữ liệu mẫu theo hình dạng PKHNEW; kịch bản lỗi được test fake gateway gọi trực tiếp.
export const routes: Record<string, (body: Body) => unknown> = {
  'Patients/PostPatients': (b) => {
    scenario(b);
    const id = `26${String(patientNumber++).padStart(8, '0')}`;
    const patient = {
      id,
      surname: String(b.surname),
      name: String(b.name),
      birthyear: String(b.birthyear),
      sex: Number(b.sex),
      mobile: String(b.mobile),
      social_id: String(b.social_id),
    };
    patients.set(id, patient);
    return patient;
  },
  'Patients/PostPatients_checkbh': (b) => ({ result: patients.has(String(b.id)), note: 'Hợp lệ' }),
  'Booking/PostPatientBHYT': (b) => ({ patient_code: b.patient_code, date: b.date }),
  'Booking/PostBooking': (b) => {
    scenario(b);
    const id = String(b.id);
    const existing = bookings.get(id);
    if (existing) return { ...existing, Numerical_order: existing.booking_number };
    const row = {
      id,
      patient_code: String(b.patient_code),
      booking_date: String(b.booking_date),
      booking_number: Number(b.booking_number),
      Booking_ID: id,
    };
    bookings.set(id, row);
    return { ...row, Numerical_order: row.booking_number };
  },
  'Booking/PostBooking_Unpaid': (b) => {
    scenario(b);
    const id = String(b.id);
    const sameDay = [...bookings.values()].find(
      (v) => v.patient_code === String(b.patient_code) && v.booking_date === String(b.booking_date),
    );
    if (sameDay && sameDay.id !== id) throw Object.assign(new Error('Đã đặt trong ngày'), { code: '4014' });
    const row = sameDay ?? {
      id,
      patient_code: String(b.patient_code),
      booking_date: String(b.booking_date),
      booking_number: Number(b.booking_number),
      Booking_ID: `IDDK${id}`,
    };
    bookings.set(id, row);
    return { Numerical_Order: row.booking_number, Booking_ID: row.Booking_ID };
  },
  'Booking/GetBooking': () => [...bookings.values()],
  'Booking/GetBookingByID': (b) => {
    const row = bookings.get(String(b.ID));
    if (!row) return null;
    return { id: row.id, idbooking: row.Booking_ID, booking_number: row.booking_number };
  },
  'Booking/GetBooking_Unpaid': (b) => {
    const row = [...bookings.values()].find(
      (v) => v.patient_code === String(b.patient_code) && v.booking_date === String(b.booking_date),
    );
    return row
      ? { IDDK: row.Booking_ID, MABN: row.patient_code, NGAY: row.booking_date, SO: row.booking_number }
      : null;
  },
};
