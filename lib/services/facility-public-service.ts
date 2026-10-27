import { prisma } from '@/lib/infra/db/prisma';
import { getCatalogService } from '@/lib/services/catalog';
import type { Doctor, ExamSchedule, Room, Specialty } from '@/lib/domain/booking/schedule';

export interface PublicFacility {
  id: string;
  code: string;
  slug: string;
  name: string;
  type: string;
  provinceName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  hotline: string | null;
  workingHours: unknown;
  logoUrl: string | null;
  images: string[];
  shortDesc: string | null;
  introJson: unknown;
  status: 'ACTIVE' | 'PAUSED' | 'INACTIVE';
  health: string;
  bookingMode: 'SPECIALTY' | 'DOCTOR' | 'BOTH';
  rating: number | null;
  reviewCount: number;
}

export interface PublicReview {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  createdAt: Date;
}

export interface PublicPost {
  slug: string;
  title: string;
  excerpt: string | null;
}

export interface SpecialtyGroup {
  slug: string;
  name: string;
  facilities: { facility: PublicFacility; hisId: string }[];
}

export interface DoctorEntry {
  facility: PublicFacility;
  doctor: Doctor;
  specialtyName: string | null;
  schedules: ExamSchedule[];
  scheduleUnavailable: boolean;
  price: number | null;
}

export interface FacilityCounts {
  specialtyCount?: number;
  doctorCount?: number;
}

export interface FacilityPublicDeps {
  facilities: {
    list(): Promise<PublicFacility[]>;
    bySlug(slug: string): Promise<PublicFacility | null>;
    reviews(id: string): Promise<PublicReview[]>;
    posts(tag: string): Promise<PublicPost[]>;
  };
  catalog: Pick<
    ReturnType<typeof getCatalogService>,
    'specialties' | 'doctors' | 'schedules' | 'rooms' | 'prices'
  >;
}

// W04 mục 3: cùng tên chuyên khoa ở các HIS được gộp theo tiếng Việt không dấu.
export function publicSlug(value: string): string {
  return value
    .toLocaleLowerCase('vi')
    .replace(/đ/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function canBook(facility: PublicFacility): boolean {
  return facility.status === 'ACTIVE' && facility.health !== 'DOWN';
}

export function filterFacilities(
  facilities: PublicFacility[],
  input: { q?: string; province?: string; type?: string },
): PublicFacility[] {
  const query = publicSlug(input.q ?? '');
  return facilities.filter(
    (facility) =>
      (!query || publicSlug(facility.name).includes(query)) &&
      (!input.province || facility.provinceName === input.province) &&
      (!input.type || facility.type === input.type),
  );
}

export function groupSpecialties(
  rows: { facility: PublicFacility; specialties: Specialty[] }[],
): SpecialtyGroup[] {
  const groups = new Map<string, SpecialtyGroup>();
  for (const { facility, specialties } of rows) {
    const seen = new Set<string>();
    for (const specialty of specialties) {
      const slug = publicSlug(specialty.name);
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      const group = groups.get(slug) ?? { slug, name: specialty.name, facilities: [] };
      group.facilities.push({ facility, hisId: specialty.id });
      groups.set(slug, group);
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

async function withDeadline<T>(promise: Promise<T>, ms = 2800): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('HIS timeout')), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class FacilityPublicService {
  constructor(private readonly d: FacilityPublicDeps) {}

  listFacilities() {
    return this.d.facilities.list();
  }

  facility(slug: string) {
    return this.d.facilities.bySlug(slug);
  }

  reviews(id: string) {
    return this.d.facilities.reviews(id);
  }

  async specialtyGroups(): Promise<SpecialtyGroup[]> {
    const facilities = (await this.listFacilities()).filter(canBook);
    const results = await Promise.allSettled(
      facilities.map((facility) =>
        withDeadline(this.d.catalog.specialties(facility.code)).then((specialties) => ({
          facility,
          specialties,
        })),
      ),
    );
    return groupSpecialties(
      results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : [])),
    );
  }

  async facilityCatalog(code: string) {
    const [specialties, doctors, prices, rooms] = await Promise.allSettled([
      withDeadline(this.d.catalog.specialties(code)),
      withDeadline(this.d.catalog.doctors(code)),
      withDeadline(this.d.catalog.prices(code)),
      withDeadline(this.d.catalog.rooms(code)),
    ]);
    return {
      specialties: specialties.status === 'fulfilled' ? specialties.value : null,
      doctors: doctors.status === 'fulfilled' ? doctors.value : null,
      prices: prices.status === 'fulfilled' ? prices.value.list : null,
      rooms: rooms.status === 'fulfilled' ? rooms.value : null,
    };
  }

  /** Số liệu hiển thị lấy từ catalog có cache; từng nguồn lỗi được bỏ qua riêng. */
  async facilityCounts(facilities: PublicFacility[]): Promise<Record<string, FacilityCounts>> {
    const entries = await Promise.all(
      facilities.filter(canBook).map(async (facility) => {
        const [specialties, doctors] = await Promise.allSettled([
          withDeadline(this.d.catalog.specialties(facility.code)),
          withDeadline(this.d.catalog.doctors(facility.code)),
        ]);
        return [
          facility.code,
          {
            ...(specialties.status === 'fulfilled' ? { specialtyCount: specialties.value.length } : {}),
            ...(doctors.status === 'fulfilled' ? { doctorCount: doctors.value.length } : {}),
          },
        ] as const;
      }),
    );
    return Object.fromEntries(entries);
  }

  async doctors(input: { facility?: string; specialty?: string; date?: string; sort?: string } = {}) {
    const facilities = (await this.listFacilities()).filter(
      (facility) =>
        canBook(facility) &&
        facility.bookingMode !== 'SPECIALTY' &&
        (!input.facility || facility.code === input.facility),
    );
    // W04 mục 5: mỗi cơ sở có hạn riêng; một HIS chậm không giữ cả danh sách.
    const results = await Promise.allSettled(
      facilities.map((facility) => withDeadline(this.doctorsAtFacility(facility, input))),
    );
    const entries = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
    return entries.sort((a, b) =>
      input.sort === 'price'
        ? (a.price ?? Number.MAX_SAFE_INTEGER) - (b.price ?? Number.MAX_SAFE_INTEGER) ||
          a.doctor.name.localeCompare(b.doctor.name, 'vi')
        : a.doctor.name.localeCompare(b.doctor.name, 'vi'),
    );
  }

  private async doctorsAtFacility(
    facility: PublicFacility,
    input: { specialty?: string; date?: string },
  ): Promise<DoctorEntry[]> {
    const [doctorResult, specialtyResult, roomResult] = await Promise.allSettled([
      this.d.catalog.doctors(facility.code),
      this.d.catalog.specialties(facility.code),
      this.d.catalog.rooms(facility.code),
    ]);
    if (doctorResult.status === 'rejected') throw doctorResult.reason;
    const doctors = doctorResult.value;
    const specialties = specialtyResult.status === 'fulfilled' ? specialtyResult.value : [];
    const rooms = roomResult.status === 'fulfilled' ? roomResult.value : [];
    const results = await Promise.allSettled(
      doctors.map((doctor) => this.doctorEntry(facility, doctor, specialties, rooms)),
    );
    const entries = results
      .flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))
      .filter((entry) => {
        if (!input.specialty) return true;
        const specialty = specialties.find((item) => item.name === entry.specialtyName);
        return specialty?.id === input.specialty || publicSlug(entry.specialtyName ?? '') === input.specialty;
      });
    return input.date
      ? entries.filter((entry) => entry.schedules.some((s) => s.date === input.date))
      : entries;
  }

  private async doctorEntry(
    facility: PublicFacility,
    doctor: Doctor,
    specialties: Specialty[],
    rooms: Room[],
  ): Promise<DoctorEntry> {
    const scheduleResult = await this.d.catalog
      .schedules(facility.code, { mode: 'DOCTOR', doctor: doctor.id })
      .then((schedules) => ({ schedules, scheduleUnavailable: false }))
      .catch(() => ({ schedules: [] as ExamSchedule[], scheduleUnavailable: true }));
    const { schedules, scheduleUnavailable } = scheduleResult;
    const room = rooms.find((item) => item.id === schedules[0]?.roomId);
    const specialty = specialties.find((item) => item.id === (doctor.specialtyHisId || room?.specialtyHisId));
    return {
      facility,
      doctor,
      specialtyName: specialty?.name ?? null,
      schedules,
      scheduleUnavailable,
      price: room?.priceDv ?? null,
    };
  }

  async doctor(slug: string, maBS: string): Promise<DoctorEntry | null> {
    const facility = await this.facility(slug);
    if (!facility || !canBook(facility) || facility.bookingMode === 'SPECIALTY') return null;
    const [doctors, specialtyResult, roomResult] = await Promise.all([
      this.d.catalog.doctors(facility.code),
      this.d.catalog.specialties(facility.code).catch(() => [] as Specialty[]),
      this.d.catalog.rooms(facility.code).catch(() => [] as Room[]),
    ]);
    const doctor = doctors.find((item) => item.id === maBS);
    return doctor ? this.doctorEntry(facility, doctor, specialtyResult, roomResult) : null;
  }

  async relatedPosts(tag: string): Promise<PublicPost[]> {
    return this.d.facilities.posts(tag);
  }
}

const selection = {
  id: true,
  code: true,
  slug: true,
  name: true,
  type: true,
  provinceName: true,
  address: true,
  lat: true,
  lng: true,
  hotline: true,
  workingHours: true,
  logoUrl: true,
  images: true,
  shortDesc: true,
  introJson: true,
  status: true,
  health: true,
  bookingMode: true,
} as const;

async function attachRatings<T extends { id: string }>(
  rows: T[],
): Promise<(T & { rating: number | null; reviewCount: number })[]> {
  const ratings = await prisma.review.groupBy({
    by: ['facilityId'],
    where: { facilityId: { in: rows.map((row) => row.id) }, status: 'SHOWN' },
    _avg: { rating: true },
    _count: { rating: true },
  });
  const byId = new Map(ratings.map((item) => [item.facilityId, item]));
  return rows.map((row) => ({
    ...row,
    rating: byId.get(row.id)?._avg.rating ?? null,
    reviewCount: byId.get(row.id)?._count.rating ?? 0,
  }));
}

const service = new FacilityPublicService({
  facilities: {
    async list() {
      const rows = await prisma.facility.findMany({
        where: { status: { in: ['ACTIVE', 'PAUSED'] } },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 100,
        select: selection,
      });
      return attachRatings(rows);
    },
    async bySlug(slug) {
      const row = await prisma.facility.findUnique({ where: { slug }, select: selection });
      if (!row || row.status === 'INACTIVE') return null;
      return (await attachRatings([row]))[0] ?? null;
    },
    reviews: (id) =>
      prisma.review.findMany({
        where: { facilityId: id, status: 'SHOWN' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, rating: true, comment: true, reply: true, createdAt: true },
      }),
    posts: (tag) =>
      prisma.post.findMany({
        where: { status: 'PUBLISHED', publishedAt: { lte: new Date() }, specialtyTags: { has: tag } },
        orderBy: { publishedAt: 'desc' },
        take: 6,
        select: { slug: true, title: true, excerpt: true },
      }),
  },
  catalog: getCatalogService(),
});

export function getFacilityPublicService(): FacilityPublicService {
  return service;
}
