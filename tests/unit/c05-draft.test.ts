import { describe, expect, it } from 'vitest';
import type { BookingDraft } from '@/lib/domain/booking/draft';
import type { CatalogFacility } from '@/lib/domain/booking/schedule';
import { BookingDraftService } from '@/lib/services/catalog/booking-draft-service';
import type { CatalogService } from '@/lib/services/catalog/catalog-service';
import { CACHE_TTL, cacheKeys } from '@/lib/infra/redis/client';

const facility: CatalogFacility = {
  id: 'f1',
  code: 'BVA',
  name: 'BV A',
  address: 'A',
  status: 'ACTIVE',
  health: 'OK',
  bookingMode: 'SPECIALTY',
  allowBhyt: true,
  allowSameDay: false,
  payOptions: ['AT_FACILITY'],
};
const choice = {
  facilityCode: 'BVA',
  mode: 'ROOM' as const,
  specialtyHisId: 'NOI',
  specialtyName: 'Sai tên',
  roomHisId: 101,
  roomName: 'Sai phòng',
  examDate: '2026-10-28',
  slotHisId: 1,
  slotLabel: 'Sai giờ',
  objectType: 'DICH_VU' as const,
};

function setup(visited = true) {
  const cache = new Map<string, unknown>();
  const held = new Set<number>();
  const catalog = {
    facility: async () => facility,
    specialties: async () => [{ id: 'NOI', name: 'Nội tổng quát' }],
    rooms: async () => [
      {
        id: 101,
        name: 'Phòng Nội',
        specialtyHisId: 'NOI',
        priceDv: 200000,
        priceBh: 34500,
        priceT7: 250000,
        priceCn: 300000,
      },
    ],
    doctors: async () => [],
    schedules: async () => [{ date: '2026-10-28', roomId: 101, doctorId: '1' }],
    slots: async () => [
      {
        id: 1,
        label: '07:00–08:00',
        remaining: held.size ? 0 : 1,
        nextNumber: held.size ? undefined : 1,
        startNumber: 1,
        maxNumber: 1,
        numberOfJumps: 1,
      },
    ],
    isBookingNumberUsed: async () => false,
  } as unknown as CatalogService;
  const service = new BookingDraftService({
    catalog,
    keys: cacheKeys,
    ttl: CACHE_TTL,
    rules: { hasSameDay: async () => false, countUnexamined: async () => 0 },
    cache: {
      get: async <T>(k: string) => (cache.get(k) as T) ?? null,
      set: async (k, v) => {
        cache.set(k, v);
      },
      del: async (k) => {
        cache.delete(k);
      },
    },
    holds: {
      heldNumbers: async () => [...held],
      tryHold: async (_f, _r, _d, n) => {
        if (held.has(n)) return false;
        held.add(n);
        return true;
      },
    },
    identity: { resolve: async () => ({ status: 'FOUND', hasVisited: visited }) },
  });
  return { service, cache, held };
}

describe('C05 draft và giữ STT', () => {
  it('lưu tên/giá HIS, chỉ chủ draft được đọc', async () => {
    const { service, cache } = setup();
    const draft = await service.save('account-1', choice);
    expect(draft).toMatchObject({ specialtyName: 'Nội tổng quát', roomName: 'Phòng Nội', amount: 200000 });
    expect(cache.get(`draft:${draft.id}`)).toMatchObject({ accountId: 'account-1' });
    await expect(service.load('account-2', draft.id)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
  it('BHYT đòi đã từng khám', async () => {
    const { service } = setup(false);
    await expect(service.save('account-1', { ...choice, objectType: 'BHYT' })).rejects.toMatchObject({
      code: 'BOOKING_BHYT_NOT_ALLOWED',
    });
  });
  it('khóa Redis NX chỉ cấp một người số cuối', async () => {
    const { service, cache } = setup();
    const first = await service.save('a1', choice);
    const second: BookingDraft = { ...first, id: crypto.randomUUID(), accountId: 'a2' };
    cache.set(`draft:${second.id}`, second);
    expect((await service.hold('a1', first.id)).bookingNumber).toBe(1);
    await expect(service.hold('a2', second.id)).rejects.toMatchObject({ code: 'BOOKING_SLOT_FULL' });
  });
});
