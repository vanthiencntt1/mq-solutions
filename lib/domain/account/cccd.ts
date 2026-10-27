// Quy tắc CCCD (C01 mục 3): 12 chữ số; số thứ 4 là mã thế kỷ + giới tính, số 5–6 là 2 số cuối năm sinh.

export const CCCD_REGEX = /^\d{12}$/;
export const PHONE_REGEX = /^0\d{9}$/;

export function isValidCccd(cccd: string): boolean {
  return CCCD_REGEX.test(cccd);
}

/** Số thứ 5–6 của CCCD phải khớp 2 số cuối năm sinh – bắt lỗi gõ nhầm. */
export function cccdMatchesBirthYear(cccd: string, birthYear: number): boolean {
  if (!isValidCccd(cccd)) return false;
  return cccd.slice(4, 6) === String(birthYear).slice(-2);
}

/**
 * Số thứ 4 của CCCD = mã thế kỷ + giới tính: 0 nam 1900s, 1 nữ 1900s, 2 nam 2000s, 3 nữ 2000s, 4 nam 2100s, 5 nữ 2100s.
 * gender theo HIS: 1 nam, 0 nữ.
 */
export function cccdMatchesGenderCentury(cccd: string, birthYear: number, gender: 0 | 1): boolean {
  if (!isValidCccd(cccd)) return false;
  const code = Number(cccd[3]);
  const century = Math.floor(birthYear / 100) - 19; // 1900s → 0, 2000s → 1
  if (century < 0 || century > 2) return false;
  return code === century * 2 + (gender === 1 ? 0 : 1);
}

/** Họ tên không dấu, viết hoa, gộp khoảng trắng – dùng đối chiếu HIS (C03 mục 4). */
export function normalizeName(fullName: string): string {
  return fullName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

/** Tách họ tên cho PostPatients: tên = từ cuối, họ + đệm = phần còn lại (C03 mục 5). */
export function splitName(fullName: string): { surname: string; name: string } {
  const parts = fullName.trim().split(/\s+/);
  const name = parts.pop() ?? '';
  return { surname: parts.join(' '), name };
}
