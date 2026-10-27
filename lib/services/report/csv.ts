import type { BookingRow, RevenueRow } from './types';

function cell(value: string | number): string {
  const text = String(value);
  // A10 mục 2: tên cơ sở/khoa là dữ liệu nhập; chặn công thức khi mở CSV bằng Excel.
  const safe = /^[\s]*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
}

function line(values: (string | number)[]): string {
  return values.map(cell).join(',');
}

export function reportCsv(bookings: BookingRow[], revenue: RevenueRow[]): string {
  const rows = [
    line([
      'Loại',
      'Kỳ/ngày',
      'Cơ sở',
      'Chuyên khoa',
      'Đối tượng',
      'Thanh toán',
      'Số lịch',
      'Đã hủy',
      'Đã khám',
      'Lỗi HIS',
      'Online (VND)',
      'Hoàn tiền (VND)',
    ]),
    ...bookings.map((row) =>
      line([
        'Đặt khám',
        row.period,
        row.facilityName,
        row.specialtyName,
        row.objectType,
        row.payMethod,
        row.bookings,
        row.cancelled,
        row.attended,
        row.hisErrors,
        '',
        '',
      ]),
    ),
    ...revenue.map((row) =>
      line([
        'Doanh thu',
        row.day,
        row.facilityName,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        row.onlineVnd,
        row.refundedVnd,
      ]),
    ),
  ];
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}
