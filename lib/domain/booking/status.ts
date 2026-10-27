// Vòng đời phiếu khám (C08). Chỉ cho phép các bước chuyển trong sơ đồ trang-thai-phieu.

export type AppointmentStatus =
  | 'CHO_THANH_TOAN'
  | 'QUA_HAN'
  | 'DA_THANH_TOAN'
  | 'DANG_GUI_HIS'
  | 'LOI_HIS'
  | 'DA_CO_STT'
  | 'DA_KHAM'
  | 'DA_HUY'
  | 'CHO_HOAN_TIEN'
  | 'DA_HOAN_TIEN';

const TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  CHO_THANH_TOAN: ['QUA_HAN', 'DA_THANH_TOAN'],
  QUA_HAN: ['DA_THANH_TOAN', 'CHO_HOAN_TIEN'], // tiền đến muộn (C07 mục 4)
  DA_THANH_TOAN: ['DANG_GUI_HIS'],
  DANG_GUI_HIS: ['DA_CO_STT', 'LOI_HIS', 'DA_HUY'],
  LOI_HIS: ['DANG_GUI_HIS', 'CHO_HOAN_TIEN', 'DA_HUY'],
  DA_CO_STT: ['DA_KHAM', 'DA_HUY'],
  DA_KHAM: [],
  DA_HUY: ['CHO_HOAN_TIEN'],
  CHO_HOAN_TIEN: ['DA_HOAN_TIEN'],
  DA_HOAN_TIEN: [],
};

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  CHO_THANH_TOAN: 'Chờ thanh toán',
  QUA_HAN: 'Quá hạn thanh toán',
  DA_THANH_TOAN: 'Đã thanh toán',
  DANG_GUI_HIS: 'Đang gửi cơ sở',
  LOI_HIS: 'Đang xử lý',
  DA_CO_STT: 'Đặt khám thành công',
  DA_KHAM: 'Đã khám',
  DA_HUY: 'Đã hủy',
  CHO_HOAN_TIEN: 'Chờ hoàn tiền',
  DA_HOAN_TIEN: 'Đã hoàn tiền',
};
