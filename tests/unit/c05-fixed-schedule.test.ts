import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import {
  fixedScheduleSchema,
  fixedSchedules,
  type CatalogFacility,
  type FixedSchedule,
} from '@/lib/domain/booking/schedule';
import { CatalogService, type CatalogDeps } from '@/lib/services/catalog/catalog-service';
import { CACHE_TTL, cacheKeys } from '@/lib/infra/redis/client';

const config: FixedSchedule = {
  weekdays: [1, 2, 3, 4, 5, 6],
  slots: [
    { start: '07:00', end: '11:00', fromNumber: 1, toNumber: 5 },
    { start: '13:00', end: '16:00', fromNumber: 6, toNumber: 10 },
  ],
  doctorId: '0001',
  roomDoctors: { '102': '0009' },
};

const facility: CatalogFacility = {
  id: 'f1',
  code: 'BVAB',
  name: 'Bệnh viện An Bình',
  address: 'A',
  status: 'ACTIVE',
  health: 'OK',
  bookingMode: 'SPECIALTY',
  allowBhyt: false,
  allowSameDay: false,
  payOptions: ['ONLINE', 'AT_FACILITY'],
  scheduleSource: 'FIXED',
  fixedSchedule: config,
};

// 2026-10-27 là Thứ 3 (giờ VN)
const now = () => new Date('2026-10-27T03:00:00Z');

function setup(used: number[] = []) {
  const calls: string[] = [];
  const deps: CatalogDeps = {
    keys: cacheKeys,
    ttl: CACHE_TTL,
    facilities: { findByCode: async () => facility, list: async () => [facility], warnNoDoctors: async () => {} },
    cache: { get: async () => null, set: async () => {}, del: async () => {} },
    his: {
      call: async <T>(_id: string, path: string) => {
        calls.push(path);
        if (path === 'Booking/Getserialnumber') return used.map((n) => ({ Stt: n })) as T;
        throw new AppError('NOT_FOUND');
      },
    },
    holds: { heldNumbers: async () => [], tryHold: async () => true },
    now,
  };
  return { service: new CatalogService(deps), calls };
}

describe('C05 khung giờ cố định (FIXED)', () => {
  it('sinh ngày theo thứ, bỏ hôm nay và Chủ nhật, gắn bác sĩ theo phòng', () => {
    const rows = fixedSchedules(config, 101, now(), false);
    expect(rows[0]).toEqual({ date: '2026-10-28', roomId: 101, doctorId: '0001' });
    expect(rows.some((r) => r.date === '2026-10-27')).toBe(false);
    expect(rows.some((r) => r.date === '2026-11-01')).toBe(false); // Chủ nhật
    expect(rows).toHaveLength(12); // 14 ngày trừ 2 Chủ nhật
    expect(fixedSchedules(config, 102, now(), false)[0]?.doctorId).toBe('0009');
  });

  it('không gọi GetSchedules/GetRoomTimeSlots; STT = số nhỏ nhất HIS chưa dùng', async () => {
    const { service, calls } = setup([1, 2, 4]);
    const slots = await service.slots('BVAB', 101, '2026-10-28');
    expect(calls).not.toContain('Schedules/GetSchedules');
    expect(calls).not.toContain('Rooms/GetRoomTimeSlots');
    expect(slots.map((s) => [s.label, s.nextNumber, s.remaining, s.doctorId])).toEqual([
      ['07:00–11:00', 3, 2, '0001'],
      ['13:00–16:00', 6, 5, '0001'],
    ]);
  });

  it('chọn theo bác sĩ không có lịch cố định', async () => {
    const { service } = setup();
    expect(await service.schedules('BVAB', { mode: 'DOCTOR', doctor: '0001' })).toEqual([]);
  });

  it('chặn dải số chồng nhau và thiếu mã bác sĩ', () => {
    expect(
      fixedScheduleSchema.safeParse({
        ...config,
        slots: [config.slots[0], { ...config.slots[1], fromNumber: 5 }],
      }).success,
    ).toBe(false);
    expect(fixedScheduleSchema.safeParse({ ...config, doctorId: '' }).success).toBe(false);
  });
});
