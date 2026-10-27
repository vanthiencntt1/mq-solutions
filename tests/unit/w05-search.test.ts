import { describe, expect, it } from 'vitest';
import type { SearchDeps } from '@/lib/domain/search/ports';
import { normalizeKeyword } from '@/lib/domain/search/types';
import { SearchService } from '@/lib/services/search/search-service';

function setup() {
  const logs: { term: string; total: number }[] = [];
  const calls: string[] = [];
  let allowed = true;
  const deps: SearchDeps = {
    repository: {
      async facilities(term, skip, take) {
        calls.push(`facilities:${term}:${skip}:${take}`);
        return {
          items: [{ type: 'facilities', title: 'Bệnh viện Nhi', href: '/co-so/benh-vien-nhi' }],
          total: 12,
        };
      },
      async posts(term, skip, take) {
        calls.push(`posts:${term}:${skip}:${take}`);
        return {
          items: [{ type: 'posts', title: 'Khám Nhi', href: '/tin-tuc/kham-nhi' }],
          total: 1,
        };
      },
      async log(term, total) {
        logs.push({ term, total });
      },
    },
    catalog: {
      async specialties() {
        return [{ name: 'Nhi khoa' }, { name: 'Nội tiết' }, { name: 'Nhi khoa' }];
      },
      async doctors() {
        return [
          { name: 'Bác sĩ Nhi', code: 'BS01', facilitySlug: 'benh-vien-nhi', facilityName: 'Bệnh viện Nhi' },
          { name: 'Bác sĩ Nội', code: 'BS02', facilitySlug: 'benh-vien-nhi' },
        ];
      },
    },
    limiter: {
      async hit(key, limit, windowSec) {
        calls.push(`limit:${key}:${limit}:${windowSec}`);
        return { allowed };
      },
    },
  };
  return {
    service: new SearchService(deps),
    deps,
    calls,
    logs,
    deny: () => {
      allowed = false;
    },
  };
}

describe('W05 chuẩn hóa từ khóa', () => {
  it('bỏ dấu, đổi đ và gom khoảng trắng', () => {
    expect(normalizeKeyword('  NỘI   tiết  ')).toBe('noi tiet');
    expect(normalizeKeyword('ĐẶT khám')).toBe('dat kham');
  });
});

describe('W05 ghép kết quả tìm kiếm', () => {
  it('gộp bốn nhóm, bỏ chuyên khoa trùng, dùng cache khi có', async () => {
    const { service, calls, logs } = setup();
    const result = await service.search({ q: ' nhi ', type: 'all', page: 1, ipHash: 'hash-ip' });
    expect(result.totals).toEqual({ facilities: 12, specialties: 1, doctors: 1, posts: 1 });
    expect(result.total).toBe(15);
    expect(result.groups.specialties[0]?.href).toBe('/chuyen-khoa/nhi-khoa');
    expect(result.groups.doctors[0]?.href).toBe('/co-so/benh-vien-nhi/bac-si/BS01');
    expect(calls).toContain('limit:search:hash-ip:30:60');
    expect(logs).toEqual([{ term: 'nhi', total: 15 }]);
  });

  it('tìm không dấu ra Nội tiết, lọc một nhóm và phân trang', async () => {
    const { service, calls } = setup();
    const result = await service.search({ q: 'noi tiet', type: 'specialties', page: 2, ipHash: 'ip' });
    expect(result.groups.specialties).toEqual([]);
    expect(result.totals.specialties).toBe(1);
    expect(calls.filter((call) => call.startsWith('facilities:'))).toEqual([]);
    const first = await service.suggest('nội tiết', 'ip');
    expect(first.groups.specialties[0]?.title).toBe('Nội tiết');
    expect(first.pageSize).toBe(5);
  });

  it('cache danh mục chưa có thì bỏ qua hai nhóm HIS', async () => {
    const { service, deps } = setup();
    deps.catalog.specialties = async () => [];
    deps.catalog.doctors = async () => [];
    const result = await service.search({ q: 'nhi', type: 'all', page: 1, ipHash: 'ip' });
    expect(result.totals.specialties).toBe(0);
    expect(result.totals.doctors).toBe(0);
    expect(result.total).toBe(13);
  });

  it('không ghi từ khóa có số và không ghi lượt gợi ý', async () => {
    const { service, logs } = setup();
    await service.search({ q: '0901234567', type: 'all', page: 1, ipHash: 'ip' });
    await service.suggest('nhi', 'ip');
    expect(logs).toEqual([]);
  });

  it('chặn trước khi truy vấn khi vượt 30 lượt/phút/IP', async () => {
    const { service, deny, calls } = setup();
    deny();
    await expect(service.suggest('nhi', 'ip')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(calls).toEqual(['limit:search:ip:30:60']);
  });
});
