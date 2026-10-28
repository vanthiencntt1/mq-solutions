import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import {
  AdminCatalogService,
  type AdminCatalogDeps,
} from '@/lib/services/admin-catalog/admin-catalog-service';

const actor: AdminPrincipal = {
  id: 'a1',
  role: 'OPERATOR',
  facilityIds: ['f1'],
  name: 'Nhân viên',
  permissions: ['catalog:read', 'catalog:clear'],
};
const facility = { id: 'f1', code: 'BVA', name: 'Bệnh viện A', status: 'ACTIVE', health: 'OK' };

function setup() {
  const cache = new Map<string, unknown>();
  const calls: string[] = [];
  const purged: string[] = [];
  const audited: string[] = [];
  let now = new Date('2026-10-27T03:00:00Z');
  let hisError = false;
  let allowed = true;
  let health = 'OK';
  let price = 100000;
  const deps: AdminCatalogDeps = {
    his: {
      call: async <T>(_facilityId: string, path: string) => {
        calls.push(path);
        if (hisError) throw new AppError('HIS_UNAVAILABLE');
        if (path === 'Subjects/GetSubjects') return [{ id: 1, name: 'Nội tổng quát' }] as T;
        if (path === 'Rooms/GetRooms')
          return [{ id: 101, name: 'Phòng 101', price_dv: 100000, price_t7: 120000 }] as T;
        if (path === 'Schedules/GetSchedules')
          return [{ date_time: '20261028', room_id: 101, doctor_id: 7 }] as T;
        if (path === 'Rooms/GetRoomTimeSlots')
          return [
            {
              id: 101,
              start_time: '07:00',
              end_time: '08:00',
              startnumber: 1,
              maxnumber: 5,
              numberofjumps: 1,
            },
            {
              id: 102,
              start_time: '08:00',
              end_time: '09:00',
              startnumber: 1,
              maxnumber: 5,
              numberofjumps: 1,
            },
          ] as T;
        if (path === 'Booking/Getserialnumber') return [{ Stt: 1 }, { Stt: 3 }] as T;
        if (path === 'PriceList/GetPriceList') return [{ ID: 101, Name: 'Khám', Price: price }] as T;
        throw new AppError('NOT_FOUND');
      },
    },
    cache: {
      get: async <T>(key: string) => (cache.get(key) as T) ?? null,
      set: async (key, value) => {
        cache.set(key, value);
      },
      del: async (key) => {
        cache.delete(key);
      },
    },
    facilities: {
      list: async (ids) => (ids?.includes('f1') ? [{ ...facility, health }] : []),
      findByCode: async (code) => (code === 'BVA' ? { ...facility, health } : null),
    },
    limiter: { hit: async () => ({ allowed }) },
    purge: async (code) => {
      purged.push(code);
      cache.clear();
    },
    audit: async (adminId, facilityId, ipHash) => {
      audited.push(`${adminId}:${facilityId}:${ipHash}`);
    },
    now: () => now,
    ttl: { catalog: 3600, schedule: 300, adminCatalog: 86400 },
  };
  return {
    service: new AdminCatalogService(deps),
    cache,
    calls,
    purged,
    audited,
    setNow: (date: string) => {
      now = new Date(date);
    },
    setHisError: () => {
      hisError = true;
    },
    setHealth: (value: string) => {
      health = value;
    },
    setAllowed: (value: boolean) => {
      allowed = value;
    },
    setPrice: (value: number) => {
      price = value;
    },
  };
}

describe('A03 danh mục admin', () => {
  it('chỉ hiển thị cơ sở thuộc phạm vi và chặn truy cập chéo', async () => {
    const { service, calls } = setup();
    expect(await service.listFacilities(actor)).toHaveLength(1);
    await expect(
      service.read({ ...actor, facilityIds: ['f2'] }, { facility: 'BVA', kind: 'specialties' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(calls).toHaveLength(0);
  });

  it('parse HIS, ghi cache và hiện nguồn dữ liệu cùng thời điểm lấy', async () => {
    const { service, calls } = setup();
    const query = { facility: 'BVA', kind: 'specialties' as const };
    expect(await service.read(actor, query)).toMatchObject({
      rows: [{ id: '1', name: 'Nội tổng quát' }],
      source: 'his',
      fetchedAt: '2026-10-27T03:00:00.000Z',
    });
    expect(await service.read(actor, query)).toMatchObject({ source: 'cache' });
    expect(calls).toEqual(['Subjects/GetSubjects']);
  });

  it('phòng chỉ lấy GetRooms (không gọi T7/CN) và đếm số đã dùng của khung giờ', async () => {
    const { service, calls } = setup();
    const rooms = await service.read(actor, { facility: 'BVA', kind: 'rooms' });
    expect(rooms.rows).toMatchObject([{ priceDv: 100000 }]);
    expect(calls).not.toContain('Rooms/GetRoomsT7CN');
    const slots = await service.read(actor, {
      facility: 'BVA',
      kind: 'slots',
      room: 101,
      date: '2026-10-28',
    });
    expect(slots.rows).toMatchObject([{ id: 101, usedCount: 2 }]);
    expect(slots.rows).toHaveLength(1);
  });

  it('dùng bản dự phòng khi HIS lỗi và từ chối bản quá 24 giờ', async () => {
    const state = setup();
    const query = { facility: 'BVA', kind: 'specialties' as const };
    await state.service.read(actor, query);
    state.cache.delete('a03:BVA:specialties:all:all');
    state.setHisError();
    state.setNow('2026-10-28T02:00:00Z');
    expect(await state.service.read(actor, query)).toMatchObject({ source: 'stale' });
    state.setNow('2026-10-28T04:00:00Z');
    await expect(state.service.read(actor, query)).rejects.toMatchObject({ code: 'HIS_UNAVAILABLE' });
  });

  it('xóa cache theo cơ sở, ghi audit và giới hạn tần suất', async () => {
    const state = setup();
    await state.service.clear(actor, 'BVA', 'ip1');
    expect(state.purged).toEqual(['BVA']);
    expect(state.audited).toEqual(['a1:f1:ip1']);
    state.setAllowed(false);
    await expect(state.service.clear(actor, 'BVA', 'ip1')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    await expect(
      state.service.clear({ ...actor, permissions: ['catalog:read'] }, 'BVA', 'ip1'),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('sau khi xóa cache, bảng giá lấy giá mới từ HIS', async () => {
    const state = setup();
    const query = { facility: 'BVA', kind: 'prices' as const };
    expect((await state.service.read(actor, query)).rows).toMatchObject([{ Price: 100000 }]);
    state.setPrice(150000);
    expect((await state.service.read(actor, query)).rows).toMatchObject([{ Price: 100000 }]);
    await state.service.clear(actor, 'BVA', 'ip1');
    expect((await state.service.read(actor, query)).rows).toMatchObject([{ Price: 150000 }]);
  });

  it('chặn ngày ngoài lịch 14 ngày trước khi gọi HIS', async () => {
    const { service, calls } = setup();
    await expect(
      service.read(actor, { facility: 'BVA', kind: 'slots', room: 101, date: '2026-11-15' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(calls).toHaveLength(0);
  });
});
