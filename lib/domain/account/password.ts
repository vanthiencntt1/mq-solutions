// Mật khẩu cấp 1 lần qua Gmail + chính sách đổi mật khẩu (C01 mục 4, 6).

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // bỏ I, O dễ nhầm
const LOWER = 'abcdefghijkmnpqrstuvwxyz'; // bỏ l, o
const DIGIT = '23456789'; // bỏ 0, 1
const ALL = UPPER + LOWER + DIGIT;

/** Sinh mật khẩu 10 ký tự có chữ hoa, chữ thường, số. `randomInt(n)` trả số nguyên [0, n) (crypto.randomInt). */
export function generateTempPassword(randomInt: (max: number) => number, length = 10): string {
  const pick = (set: string) => set[randomInt(set.length)]!;
  const chars = [pick(UPPER), pick(LOWER), pick(DIGIT)];
  while (chars.length < length) chars.push(pick(ALL));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join('');
}

export interface PasswordContext {
  cccd: string;
  phone: string;
  birthYear: number;
  birthDate?: Date | null;
}

/** Trả danh sách lỗi (rỗng = hợp lệ): ≥ 8 ký tự, có chữ và số, không chứa CCCD / SĐT / năm sinh / ngày sinh. */
export function checkPasswordPolicy(pw: string, ctx: PasswordContext): string[] {
  const errors: string[] = [];
  if (pw.length < 8) errors.push('Tối thiểu 8 ký tự');
  if (pw.length > 72) errors.push('Tối đa 72 ký tự');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) errors.push('Phải có cả chữ và số');
  const banned = [ctx.cccd, ctx.cccd.slice(-6), ctx.phone, ctx.phone.slice(-6), String(ctx.birthYear)];
  if (ctx.birthDate) {
    const d = ctx.birthDate;
    const dd = String(d.getUTCDate()).padStart(2, '0');
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    banned.push(`${dd}${mm}${d.getUTCFullYear()}`, `${dd}${mm}`);
  }
  if (banned.some((b) => b.length >= 4 && pw.includes(b)))
    errors.push('Không dùng CCCD, số điện thoại, năm sinh hoặc ngày sinh');
  return errors;
}
