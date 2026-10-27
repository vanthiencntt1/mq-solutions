import { DOCTORS, ROOMS, SUBJECTS, TIME_SLOTS } from '../data';

const doctors = DOCTORS.map((d, i) => ({
  id: i + 1,
  fullname: d.name,
  role: d.title,
  subject_id: d.subject_id,
}));
const nextDates = () =>
  Array.from({ length: 14 }, (_, i) => {
    const date = new Date(Date.now() + (i + 1) * 86_400_000);
    return date.toISOString().slice(0, 10).replaceAll('-', '');
  });

// File route riêng của C05; server mock nạp tự động và ưu tiên các endpoint này.
export const routes: Record<string, (body: Record<string, unknown>) => unknown> = {
  'Subjects/GetSubjects': () => SUBJECTS,
  'Doctors/GetDoctors': () => doctors,
  'Rooms/GetRooms': () => ROOMS,
  'Rooms/GetRoomsT7CN': () => ROOMS,
  'Rooms/GetRoombySubjectID': (b) => ROOMS.filter((r) => r.subject_id === String(b.ID)),
  'Rooms/GetRoomTimeSlots': () => TIME_SLOTS,
  'Rooms/GetRoomTimes': () => ROOMS.map((r) => ({ ID: String(r.id), StartTime: '07:00', EndTime: '16:00' })),
  'Schedules/GetSchedules': (b) =>
    nextDates().flatMap((date_time) =>
      ROOMS.filter((r) => !Number(b.room_id) || r.id === Number(b.room_id)).flatMap((r) => {
        const doctor = doctors.find((d) => d.subject_id === r.subject_id);
        return doctor && (!Number(b.doctor_id) || doctor.id === Number(b.doctor_id))
          ? [{ date_time, room_id: r.id, doctor_id: doctor.id, slot_time: 'SANG' }]
          : [];
      }),
    ),
  'Booking/Getserialnumber': () => [],
  'Booking/GetBookingNumber': () => null,
  'PriceList/GetPriceList': () =>
    ROOMS.map((r) => ({ ID: String(r.id), Name: r.name, Price: String(r.price_dv) })),
  'Cities/GetCities': () => [{ id: '79', name: 'TP. Hồ Chí Minh' }],
  'Districts/GetDistricts': () => [{ id: '760', name: 'Quận 1', city_id: '79' }],
  'Wards/GetWards': () => [{ id: '26734', name: 'Phường Bến Nghé', district_id: '760', city_id: '79' }],
  'Countries/GetCountries': () => [{ id: 'VN', name: 'Việt Nam' }],
  'Jobs/GetJobs': () => [{ id: '1', name: 'Nhân viên' }],
  'Nations/GetNations': () => [{ id: 1, name: 'Kinh' }],
};
