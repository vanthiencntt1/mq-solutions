import { beforeEach, describe, expect, it, vi } from 'vitest';

// Redis giả trong bộ nhớ: đủ get/set NX cho payment-holds
const store = new Map<string, string>();
vi.mock('@/lib/infra/redis/client', () => ({
  cacheKeys: {
    slotHold: (f: string, r: string, d: string, n: number) => `slot:${f}:${r}:${d}:${n}`,
  },
  getRedis: () => ({
    get: async (k: string) => store.get(k) ?? null,
    set: async (k: string, v: string, ..._args: unknown[]) => {
      if (store.has(k)) return null;
      store.set(k, v);
      return 'OK';
    },
  }),
}));

const { redisPaymentHolds, draftIdOf } = await import('@/lib/infra/payment/payment-holds');

const row = {
  code: 'MQAD7A46F6A3',
  facilityCode: 'BVA',
  roomHisId: 101,
  examDate: '2026-10-28',
  bookingNumber: 21,
} as Parameters<typeof redisPaymentHolds.slotAvailable>[0];

describe('payment-holds', () => {
  beforeEach(() => store.clear());

  it('đọc mã nháp đã lưu dạng JSON qua lớp cache', async () => {
    store.set('booking:draft-of:MQAD7A46F6A3', JSON.stringify('draft-1'));
    expect(await draftIdOf('MQAD7A46F6A3')).toBe('draft-1');
  });

  it('số đang do chính bản nháp của phiếu giữ → còn chỗ (không chuyển hoàn tiền)', async () => {
    store.set('booking:draft-of:MQAD7A46F6A3', JSON.stringify('draft-1'));
    store.set('slot:BVA:101:2026-10-28:21', 'draft-1');
    expect(await redisPaymentHolds.slotAvailable(row)).toBe(true);
  });

  it('số đã bị bản nháp khác giữ → hết chỗ', async () => {
    store.set('booking:draft-of:MQAD7A46F6A3', JSON.stringify('draft-1'));
    store.set('slot:BVA:101:2026-10-28:21', 'draft-2');
    expect(await redisPaymentHolds.slotAvailable(row)).toBe(false);
  });

  it('khóa giữ đã hết hạn → chiếm lại số cho phiếu', async () => {
    expect(await redisPaymentHolds.slotAvailable(row)).toBe(true);
    expect(store.get('slot:BVA:101:2026-10-28:21')).toBe('MQAD7A46F6A3');
  });
});
