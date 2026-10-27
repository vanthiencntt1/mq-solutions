import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { CatalogFacility } from '@/lib/domain/booking/schedule';
import { CatalogService, type CatalogDeps } from '@/lib/services/catalog/catalog-service';
import { CACHE_TTL, cacheKeys } from '@/lib/infra/redis/client';

const facility: CatalogFacility = {
  id: 'f1',
  code: 'BVA',
  name: 'Bệnh viện A',
  address: 'A',
  status: 'ACTIVE',
  health: 'OK',
  bookingMode: 'SPECIALTY',
  allowBhyt: true,
  allowSameDay: false,
  payOptions: ['ONLINE'],
};

function setup(health = 'OK') {
  const cache = new Map<string, unknown>();
  const calls: string[] = [];
  const deps: CatalogDeps = {
    keys: cacheKeys,
    ttl: CACHE_TTL,
    facilities: {
      findByCode: async () => ({ ...facility, health }),
      list: async () => [facility],
      warnNoDoctors: async () => {},
    },
    cache: {
      get: async <T>(k: string) => (cache.get(k) as T) ?? null,
      set: async (k, v) => {
        cache.set(k, v);
      },
      del: async (k) => {
        cache.delete(k);
      },
    },
    his: {
      call: async <T>(_id: string, path: string) => {
        calls.push(path);
        if (path === 'Subjects/GetSubjects') return [{ id: 1, name: 'Nội tổng quát' }] as T;
        throw new AppError('HIS_UNAVAILABLE');
      },
    },
    holds: { heldNumbers: async () => [], tryHold: async () => true },
    now: () => new Date('2026-10-27T03:00:00Z'),
  };
  return { service: new CatalogService(deps), cache, calls };
}

describe('C05 cache danh mục', () => {
  it('parse HIS, lọc không dấu, dùng cache trong 60 phút', async () => {
    const { service, calls } = setup();
    expect(await service.specialties('BVA', 'noi')).toEqual([{ id: '1', name: 'Nội tổng quát' }]);
    expect(await service.specialties('BVA')).toHaveLength(1);
    expect(calls).toEqual(['Subjects/GetSubjects']);
  });
  it('cơ sở DOWN dùng bản danh mục cũ; lịch không dùng bản cũ', async () => {
    const { service, cache } = setup('DOWN');
    cache.set('his:BVA:subjects:stale', [{ id: 'NHI', name: 'Nhi' }]);
    cache.set('his:BVA:sched:room:101', [{ date_time: '20261028', room_id: 101 }]);
    expect(await service.specialties('BVA')).toEqual([{ id: 'NHI', name: 'Nhi' }]);
    await expect(service.schedules('BVA', { mode: 'ROOM', room: 101 })).rejects.toMatchObject({
      code: 'HIS_UNAVAILABLE',
    });
  });
});
