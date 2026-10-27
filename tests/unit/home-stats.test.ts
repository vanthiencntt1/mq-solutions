import { describe, expect, it, vi } from 'vitest';
import { getHomeStats, type HomeStatsDependencies } from '@/lib/services/home-service';

const facilities = [
  {
    code: 'AB',
    slug: 'an-binh',
    name: 'Bệnh viện An Bình',
    type: 'HOSPITAL',
    address: '',
    provinceName: '',
    logoUrl: null,
    allowOnlinePayment: false,
  },
  {
    code: 'TD',
    slug: 'thu-duc',
    name: 'Bệnh viện Đa khoa Thủ Đức',
    type: 'HOSPITAL',
    address: '',
    provinceName: '',
    logoUrl: null,
    allowOnlinePayment: false,
  },
];

function deps(overrides: Partial<HomeStatsDependencies> = {}): HomeStatsDependencies {
  return {
    facilities: vi.fn().mockResolvedValue(facilities),
    specialties: vi.fn().mockResolvedValue([{}, {}, {}]),
    doctors: vi.fn().mockImplementation((code: string) => Promise.resolve(code === 'AB' ? [{}, {}] : [{}])),
    ...overrides,
  };
}

describe('getHomeStats', () => {
  it('đếm cơ sở, chuyên khoa gộp và bác sĩ theo từng cơ sở ACTIVE', async () => {
    const input = deps();
    expect(await getHomeStats(input)).toEqual({ facilityCount: 2, specialtyCount: 3, doctorCount: 3 });
    expect(input.doctors).toHaveBeenCalledWith('AB');
    expect(input.doctors).toHaveBeenCalledWith('TD');
  });

  it('ẩn số bác sĩ khi một HIS lỗi', async () => {
    const result = await getHomeStats(
      deps({
        doctors: (code) => (code === 'AB' ? Promise.resolve([{}]) : Promise.reject(new Error('HIS down'))),
      }),
    );
    expect(result).toEqual({ facilityCount: 2, specialtyCount: 3 });
  });

  it('không tính cơ sở mẫu của máy dev vào số liệu công khai', async () => {
    const input = deps({
      facilities: vi
        .fn()
        .mockResolvedValue([...facilities, { ...facilities[0], code: 'BVA', name: 'Bệnh viện A (mẫu)' }]),
    });
    expect(await getHomeStats(input)).toEqual({ facilityCount: 2, specialtyCount: 3, doctorCount: 3 });
    expect(input.doctors).not.toHaveBeenCalledWith('BVA');
  });

  it('dùng cache Redis trong một giờ khi có dữ liệu', async () => {
    const cache = { get: vi.fn().mockResolvedValue(null), set: vi.fn().mockResolvedValue(undefined) };
    const input = deps({ cache });
    const result = await getHomeStats(input);
    expect(cache.set).toHaveBeenCalledWith('home:stats:v1', result, 3600);
    cache.get.mockResolvedValue(result);
    await getHomeStats(input);
    expect(input.facilities).toHaveBeenCalledTimes(1);
  });
});
