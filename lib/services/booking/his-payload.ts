import { splitName } from '@/lib/domain/account/cccd';
import type { BookingAccount, BookingRecord, PatientAddress } from '@/lib/domain/booking/confirm';
import type { IdentResult } from '@/lib/domain/identity/types';
import { AppError } from '@/lib/domain/errors';

// C06 mục 3: các trường hành chính của bệnh nhân cũ lấy từ HIS qua C03.
export function hisPatientData(row: BookingRecord, account: BookingAccount, ident: IdentResult) {
  const fullName = row.isNewPatient ? account.fullName : ident.hisFullName;
  const mobile = row.isNewPatient ? account.phone : ident.hisPhone;
  const birthyear = row.isNewPatient ? account.birthYear : ident.hisBirthYear;
  const sex = row.isNewPatient ? account.gender : ident.hisSex;
  if (!fullName || !mobile || !birthyear || sex === undefined || !row.maBN)
    throw new AppError('BOOKING_PATIENT_INFO_MISMATCH');
  const name = splitName(fullName);
  return {
    patient_code: row.maBN,
    patient_surname: name.surname,
    patient_name: name.name,
    birthyear,
    sex,
    mobile,
    social_id: account.socialId,
  };
}

export function newPatientPayload(account: BookingAccount, address: PatientAddress) {
  const name = splitName(account.fullName);
  return {
    ...name,
    sex: account.gender,
    birthyear: account.birthYear,
    birthdate: account.birthDate?.replaceAll('-', '') ?? '',
    mobile: account.phone,
    social_id: account.socialId,
    country_code: 'VN',
    city_id: address.cityId,
    district_id: address.districtId,
    ward_id: address.wardId,
    address: address.address,
  };
}

export function bookingPayload(
  row: BookingRecord,
  account: BookingAccount,
  ident: IdentResult,
  address: PatientAddress | null,
  doctorId: string,
) {
  const patient = hisPatientData(row, account, ident);
  return {
    id: row.hisId.toString(),
    booking_date: row.examDate.replaceAll('-', ''),
    booking_number: row.bookingNumber,
    room_id: row.roomHisId,
    subject_id: row.specialtyHisId,
    doctor_id: doctorId,
    // C05 chưa lưu mã dịch vụ HIS riêng; mã phòng đang là mã giá tương ứng trong danh mục.
    service_id: row.roomHisId,
    ...patient,
    patient_type: row.objectType === 'BHYT' ? 2 : 1,
    isBHYT: row.objectType === 'BHYT',
    address: address?.address ?? account.addressLine ?? '',
    city_id: address?.cityId ?? '',
    district_id: address?.districtId ?? '',
    ward_id: address?.wardId ?? '',
    country_code: 'VN',
    Note: `Khám ${row.specialtyName}`,
    amount: row.bookingApi === 'PAID' ? row.amount : 0,
    transaction_code_tt: row.bookingApi === 'PAID' ? (row.providerTxnId ?? '') : '',
    transaction_code_gd: row.bookingApi === 'PAID' ? (row.orderCode ?? '') : '',
    date_create: new Date().toISOString(),
  };
}
