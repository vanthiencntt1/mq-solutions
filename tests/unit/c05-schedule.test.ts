import { describe, expect, it } from 'vitest';
import {
  allowedExamDate,
  allowedMode,
  availableSlot,
  filterSchedules,
  priceFor,
  type Room,
} from '@/lib/domain/booking/schedule';

const now = new Date('2026-10-27T03:00:00Z');
const room: Room = {
  id: 101,
  name: 'Nội',
  specialtyHisId: 'NOI',
  priceDv: 200000,
  priceBh: 34500,
};

describe('C05 quy tắc chọn lịch', () => {
  it('giới hạn ngày, trong ngày và ngày vượt 14 ngày', () => {
    expect(allowedExamDate('2026-10-27', now, false)).toBe(false);
    expect(allowedExamDate('2026-10-27', now, true)).toBe(true);
    expect(allowedExamDate('2026-11-11', now, true)).toBe(false);
    expect(allowedExamDate('2026-02-31', now, true)).toBe(false);
  });
  it('chỉ nhận ngày Thứ 2 – Thứ 6', () => {
    expect(allowedExamDate('2026-10-30', now, false)).toBe(true); // Thứ 6
    expect(allowedExamDate('2026-10-31', now, false)).toBe(false); // Thứ 7
    expect(allowedExamDate('2026-11-01', now, false)).toBe(false); // Chủ nhật
    expect(
      filterSchedules([{ date: '2026-10-31', roomId: 101 }], { mode: 'ROOM', roomId: 101 }, now, false),
    ).toEqual([]);
  });
  it('lọc theo phòng hoặc bác sĩ và cấu hình cơ sở', () => {
    const rows = [
      { date: '2026-10-28', roomId: 101, doctorId: '1' },
      { date: '2026-10-28', roomId: 201, doctorId: '2' },
    ];
    expect(filterSchedules(rows, { mode: 'ROOM', roomId: 101 }, now, false)).toHaveLength(1);
    expect(filterSchedules(rows, { mode: 'DOCTOR', doctorId: '2' }, now, false)[0]?.roomId).toBe(201);
    expect(allowedMode('SPECIALTY', 'DOCTOR')).toBe(false);
    expect(allowedMode('BOTH', 'DOCTOR')).toBe(true);
  });
  it('giá dịch vụ và BHYT', () => {
    expect(priceFor(room, 'DICH_VU')).toBe(200000);
    expect(priceFor(room, 'BHYT')).toBe(34500);
  });
  it('trừ STT HIS và giữ chỗ, chỉ nhận bước nhảy hợp lệ', () => {
    const slot = {
      id: 1,
      startTime: '09:00',
      endTime: '10:00',
      startNumber: 1,
      maxNumber: 7,
      numberOfJumps: 2,
    };
    const result = availableSlot(slot, '2026-10-28', new Set([1, 2]), new Set([3]), now);
    expect(result).toMatchObject({ remaining: 2, nextNumber: 5 });
  });
});
