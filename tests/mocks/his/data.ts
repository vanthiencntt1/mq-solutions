// Dữ liệu giả cho mock ApiDatKham – hình dạng gần với PKHNEW (Subjects, Doctors, Rooms, Schedules, Patients).

export const SUBJECTS = [
  { id: 'NOI', name: 'Nội tổng quát' },
  { id: 'NHI', name: 'Nhi khoa' },
  { id: 'TMH', name: 'Tai mũi họng' },
];

export const DOCTORS = [
  { id: 'BS001', name: 'Nguyễn Văn An', title: 'BS CKI', subject_id: 'NOI', price: 200000 },
  { id: 'BS002', name: 'Trần Thị Bình', title: 'ThS BS', subject_id: 'NHI', price: 250000 },
  { id: 'BS003', name: 'Lê Hoàng Cường', title: 'BS', subject_id: 'TMH', price: 180000 },
];

export const ROOMS = [
  {
    id: 101,
    name: 'Phòng khám Nội 1',
    subject_id: 'NOI',
    price_dv: 200000,
    price_bh: 34500,
    price_t7: 250000,
    price_cn: 300000,
  },
  {
    id: 201,
    name: 'Phòng khám Nhi 1',
    subject_id: 'NHI',
    price_dv: 250000,
    price_bh: 34500,
    price_t7: 300000,
    price_cn: 350000,
  },
  {
    id: 301,
    name: 'Phòng khám TMH',
    subject_id: 'TMH',
    price_dv: 180000,
    price_bh: 34500,
    price_t7: 220000,
    price_cn: 260000,
  },
];

export const TIME_SLOTS = [
  { id: 1, start_time: '07:00', end_time: '08:00', startnumber: 1, maxnumber: 20, numberofjumps: 1 },
  { id: 2, start_time: '08:00', end_time: '09:00', startnumber: 21, maxnumber: 40, numberofjumps: 1 },
  { id: 3, start_time: '13:30', end_time: '14:30', startnumber: 41, maxnumber: 60, numberofjumps: 1 },
];

/** Bệnh nhân giả theo hình dạng Patient của ApiDatKham: id = MaBN, surname = họ + đệm, name = tên (C03). */
export const PATIENTS = [
  {
    id: '24000001',
    surname: 'NGUYEN VAN',
    name: 'MAU',
    birthyear: '1990',
    mobile: '0900000001',
    social_id: '079090000001',
    sex: 1,
  },
  {
    id: '24000002',
    surname: 'TRAN THI',
    name: 'THU',
    birthyear: '1985',
    mobile: '0900000002',
    social_id: '079185000002',
    sex: 0,
  },
];

/** MaBN → các tháng (MMyy) có lần khám; tháng hiện tại luôn có cho bệnh nhân cũ để thử luồng BHYT. */
export const ENCOUNTERS: Record<
  string,
  { EncounterCode: string; RoomName: string; CreateDate: string; DoctorName: string; ICDName: string }
> = {
  '24000001': {
    EncounterCode: '20261027000124000001',
    RoomName: 'Phòng khám Nội 1',
    CreateDate: new Date().toISOString().slice(0, 10),
    DoctorName: 'Nguyễn Văn An',
    ICDName: 'Viêm họng cấp',
  },
};

// Dữ liệu mẫu C04: cố ý có trường PatientCode để test service phải loại khỏi phản hồi trình duyệt.
export const TEST_RESULTS = [
  {
    PatientCode: '24000001',
    EncounterCode: ENCOUNTERS['24000001']!.EncounterCode,
    ReturnDate: new Date().toISOString().slice(0, 10),
    SymptonName: 'Công thức máu',
    ResultName: 'Bạch cầu',
    Result: '12.1',
    Unit: 'G/L',
    UsualIndex: '4–10',
    Note: 'H',
    Base64String: '',
  },
];
export const IMAGING_RESULTS = [
  {
    PatientCode: '24000001',
    EncounterCode: ENCOUNTERS['24000001']!.EncounterCode,
    CreateDate: new Date().toISOString().slice(0, 10),
    Name: 'X-quang ngực',
    Description: 'Phổi thông khí đều',
    Conclusion: 'Chưa thấy bất thường',
    Base64String: '',
  },
];
export const PRESCRIPTIONS = [
  {
    Name: 'Paracetamol 500mg',
    Quantity: '10 viên',
    Type: 'Viên nén',
    Dosage: 'Uống 1 viên khi sốt, tối đa 4 viên/ngày',
    CreateDate: new Date().toISOString().slice(0, 10),
  },
];
export const REEXAMS = [
  {
    PatientCode: 24000001,
    ReexaminationDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10).replaceAll('-', ''),
    SubjectID: 'NOI',
    RoomID: '101',
    name: 'MAU',
    surname: 'NGUYEN VAN',
    mobile: '0900000001',
  },
];
