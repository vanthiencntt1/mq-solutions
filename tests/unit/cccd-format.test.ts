import { describe, expect, it } from 'vitest';
import { cccdMatchesBirthYear, isValidCccd, normalizeName, splitName } from '@/lib/domain/account/cccd';
import { formatMoney, formatPhone, maskCccd, maskEmail, maskMaBN, maskName } from '@/lib/utils/format';

describe('CCCD (C01)', () => {
  it('12 chữ số, giữ số 0 đầu', () => {
    expect(isValidCccd('079090000001')).toBe(true);
    expect(isValidCccd('79090000001')).toBe(false);
  });
  it('số 5–6 khớp năm sinh', () => {
    expect(cccdMatchesBirthYear('079090000001', 1990)).toBe(true);
    expect(cccdMatchesBirthYear('079090000001', 1991)).toBe(false);
  });
  it('chuẩn hóa họ tên để đối chiếu HIS', () => {
    expect(normalizeName('  Nguyễn   Văn Đức ')).toBe('NGUYEN VAN DUC');
    expect(splitName('Nguyễn Văn Đức')).toEqual({ surname: 'Nguyễn Văn', name: 'Đức' });
  });
});

describe('định dạng hiển thị (10.10)', () => {
  it('tiền, SĐT, che dữ liệu', () => {
    expect(formatMoney(220000)).toBe('220.000đ');
    expect(formatPhone('0912345678')).toBe('0912 345 678');
    expect(maskCccd('079090000001')).toBe('********0001');
    expect(maskMaBN('24000001')).toBe('****0001');
    expect(maskEmail('nguyenvana@gmail.com')).toBe('n***@gmail.com');
    expect(maskName('Nguyễn Văn An')).toBe('N*** V*** A***');
    expect(maskName('An')).toBe('A***');
  });
});

describe('cn – gộp class', async () => {
  const { cn } = await import('@/lib/utils/cn');
  it('giữ màu chữ khi có cỡ chữ tùy biến', () => {
    expect(cn('text-primary-foreground', 'text-body-sm')).toBe('text-primary-foreground text-body-sm');
    expect(cn('text-body', 'text-body-sm')).toBe('text-body-sm');
  });
});
