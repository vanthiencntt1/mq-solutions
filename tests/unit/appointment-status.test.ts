import { describe, expect, it } from 'vitest';
import { canTransition } from '@/lib/domain/booking/status';

describe('vòng đời phiếu khám C08', () => {
  it('cho phép các bước chuyển hợp lệ', () => {
    expect(canTransition('CHO_THANH_TOAN', 'DA_THANH_TOAN')).toBe(true);
    expect(canTransition('DANG_GUI_HIS', 'DA_CO_STT')).toBe(true);
    expect(canTransition('DA_HUY', 'CHO_HOAN_TIEN')).toBe(true);
  });
  it('chặn bước chuyển sai', () => {
    expect(canTransition('DA_KHAM', 'DA_HUY')).toBe(false);
    expect(canTransition('CHO_THANH_TOAN', 'DA_CO_STT')).toBe(false);
  });
});
