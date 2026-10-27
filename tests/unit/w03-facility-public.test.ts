import { describe, expect, it } from 'vitest';
import {
  FacilityPublicService,
  filterFacilities,
  groupSpecialties,
  publicSlug,
  type FacilityPublicDeps,
  type PublicFacility,
} from '@/lib/services/facility-public-service';

const facility = (code: string, overrides: Partial<PublicFacility> = {}): PublicFacility => ({
  id: code,
  code,
  slug: code.toLowerCase(),
  name: `Bệnh viện ${code}`,
  type: 'BV_CONG',
  provinceName: 'Hà Nội',
  address: 'Đường A',
  lat: null,
  lng: null,
  hotline: null,
  workingHours: {},
  logoUrl: null,
  images: [],
  shortDesc: null,
  introJson: null,
  status: 'ACTIVE',
  health: 'OK',
  bookingMode: 'BOTH',
  rating: null,
  reviewCount: 0,
  ...overrides,
});

describe('W03/W04 public catalog', () => {
  it('lọc đồng thời tên không dấu, tỉnh và loại', () => {
    const rows = [
      facility('A', { name: 'Bệnh viện Đại học', provinceName: 'Hà Nội' }),
      facility('B', { name: 'Bệnh viện Đại học', provinceName: 'Đà Nẵng' }),
      facility('C', { name: 'Phòng khám Đại học', type: 'PHONG_KHAM' }),
    ];
    expect(filterFacilities(rows, { q: 'dai hoc', province: 'Hà Nội', type: 'BV_CONG' })).toEqual([rows[0]]);
  });

  it('gộp chuyên khoa theo tên không dấu, không lặp một cơ sở', () => {
    const groups = groupSpecialties([
      {
        facility: facility('A'),
        specialties: [
          { id: '1', name: 'Nhi' },
          { id: '2', name: 'NHI' },
        ],
      },
      {
        facility: facility('B'),
        specialties: [
          { id: '3', name: 'Nhi' },
          { id: '4', name: 'Tim mạch' },
        ],
      },
    ]);
    expect(publicSlug('Tai – Mũi – Họng')).toBe('tai-mui-hong');
    expect(
      groups.find((group) => group.slug === 'nhi')?.facilities.map((item) => item.facility.code),
    ).toEqual(['A', 'B']);
  });

  it('bỏ qua HIS lỗi và cơ sở PAUSED/DOWN khi tổng hợp', async () => {
    const rows = [
      facility('A'),
      facility('B'),
      facility('C', { status: 'PAUSED' }),
      facility('D', { health: 'DOWN' }),
    ];
    const calls: string[] = [];
    const catalog = {
      async specialties(code: string) {
        calls.push(code);
        if (code === 'B') throw new Error('timeout');
        return [{ id: '1', name: 'Nhi' }];
      },
      async doctors() {
        return [];
      },
      async schedules() {
        return [];
      },
      async rooms() {
        return [];
      },
      async prices() {
        return { list: [] };
      },
    } satisfies FacilityPublicDeps['catalog'];
    const service = new FacilityPublicService({
      facilities: {
        async list() {
          return rows;
        },
        async bySlug() {
          return null;
        },
        async reviews() {
          return [];
        },
        async posts() {
          return [];
        },
      },
      catalog,
    });
    expect((await service.specialtyGroups()).map((group) => group.slug)).toEqual(['nhi']);
    expect(calls).toEqual(['A', 'B']);
  });

  it('chỉ trả bác sĩ của cơ sở DOCTOR/BOTH và đúng chuyên khoa', async () => {
    const rows = [facility('A', { bookingMode: 'SPECIALTY' }), facility('B')];
    const service = new FacilityPublicService({
      facilities: {
        async list() {
          return rows;
        },
        async bySlug() {
          return null;
        },
        async reviews() {
          return [];
        },
        async posts() {
          return [];
        },
      },
      catalog: {
        async specialties() {
          return [{ id: '10', name: 'Nhi khoa' }];
        },
        async doctors() {
          // Doctors/GetDoctors có thể thiếu subject_id; suy ra khoa từ phòng trong lịch.
          return [{ id: '1', name: 'Bác sĩ An' }];
        },
        async schedules() {
          return [{ date: '2026-10-28', roomId: 2, doctorId: '1' }];
        },
        async rooms() {
          return [
            {
              id: 2,
              name: 'Phòng Nhi',
              specialtyHisId: '10',
              priceDv: 200000,
              priceBh: 0,
              priceT7: 200000,
              priceCn: 200000,
            },
          ];
        },
        async prices() {
          return { list: [] };
        },
      },
    });
    const result = await service.doctors({ specialty: 'nhi-khoa', date: '2026-10-28' });
    expect(result.map((entry) => entry.facility.code)).toEqual(['B']);
    expect(result[0]?.price).toBe(200000);
    expect(await service.doctors({ specialty: 'tim-mach' })).toEqual([]);
  });
});
