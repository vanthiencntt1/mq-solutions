import { Prisma, type Facility } from '@prisma/client';
import type { FacilityRepository, FacilityRow } from '@/lib/domain/admin/facility-ports';
import type { FacilityCreateInput, FacilityUpdateInput } from '@/lib/domain/admin/facility-schemas';
import { FacilityCreateSchema } from '@/lib/domain/admin/facility-schemas';
import { formatInTimeZone } from 'date-fns-tz';
import { prisma } from './prisma';

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
  apiBaseUrl: true,
  partnerCode: true,
  secretRef: true,
  timeoutMs: true,
  health: true,
  lastOkAt: true,
  payProvider: true,
  bankCode: true,
  bankAccountNo: true,
  bankAccountName: true,
  webhookKeyRef: true,
  bookingMode: true,
  allowBhyt: true,
  allowSameDay: true,
  scheduleSource: true,
  fixedSchedule: true,
  payOptions: true,
  cancelCutoff: true,
  reconcileTime: true,
  featured: true,
  sortOrder: true,
  status: true,
  updatedAt: true,
} as const;

type Selected = Pick<Facility, keyof typeof selection>;

function view(row: Selected, appointmentsToday = 0): FacilityRow {
  // Quy tắc nhập liệu (vd. URL phải HTTPS/IP nội bộ) chỉ chặn lúc ADMIN LƯU. Dữ liệu đã có trong DB
  // (seed, sửa tay, quy tắc đổi sau) vẫn phải đọc được, nếu không trang admin và health-check sẽ hỏng.
  const result = FacilityCreateSchema.omit({ status: true }).safeParse({
    ...row,
    payProvider: row.payProvider,
    workingHours: row.workingHours,
    introJson: row.introJson,
  });
  const parsed = result.success ? result.data : (row as unknown as typeof result.data & object);
  return {
    ...parsed,
    status: row.status,
    id: row.id,
    health: row.health,
    lastOkAt: row.lastOkAt,
    updatedAt: row.updatedAt,
    appointmentsToday,
  };
}

function createData(input: FacilityCreateInput): Prisma.FacilityCreateInput {
  return {
    ...input,
    introJson: input.introJson ?? Prisma.JsonNull,
    fixedSchedule: input.fixedSchedule ?? Prisma.JsonNull,
  };
}

function updateData(
  changes:
    (Omit<FacilityUpdateInput, 'confirmPassword'> & { health?: string }) | { status: FacilityRow['status'] },
): Prisma.FacilityUpdateInput {
  const { introJson, fixedSchedule, ...rest } = changes as Omit<FacilityUpdateInput, 'confirmPassword'> & {
    status?: FacilityRow['status'];
    health?: string;
  };
  return {
    ...rest,
    ...(introJson !== undefined ? { introJson: introJson ?? Prisma.JsonNull } : {}),
    ...(fixedSchedule !== undefined ? { fixedSchedule: fixedSchedule ?? Prisma.JsonNull } : {}),
  };
}

function todayExamDate(): Date {
  const day = formatInTimeZone(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
  return new Date(`${day}T00:00:00.000Z`);
}

export const prismaAdminFacilityRepository: FacilityRepository = {
  async list(query, scope) {
    const where: Prisma.FacilityWhereInput = {
      ...(scope === null ? {} : { id: { in: scope } }),
      ...(query.status ? { status: query.status } : {}),
      ...(query.province ? { provinceName: query.province } : {}),
      ...(query.q
        ? {
            OR: [
              { code: { contains: query.q, mode: 'insensitive' } },
              { name: { contains: query.q, mode: 'insensitive' } },
              { address: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.facility.findMany({
        where,
        select: selection,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.facility.count({ where }),
    ]);
    const counts = rows.length
      ? await prisma.appointment.groupBy({
          by: ['facilityId'],
          where: {
            facilityId: { in: rows.map((r) => r.id) },
            examDate: todayExamDate(),
            status: { not: 'DA_HUY' },
          },
          _count: { _all: true },
        })
      : [];
    const byFacility = new Map(counts.map((c) => [c.facilityId, c._count._all]));
    return { rows: rows.map((r) => view(r, byFacility.get(r.id) ?? 0)), total };
  },
  async find(id) {
    const row = await prisma.facility.findUnique({ where: { id }, select: selection });
    if (!row) return null;
    const appointmentsToday = await prisma.appointment.count({
      where: { facilityId: id, examDate: todayExamDate(), status: { not: 'DA_HUY' } },
    });
    return view(row, appointmentsToday);
  },
  async exists(code, slug) {
    return (await prisma.facility.count({ where: { OR: [{ code }, { slug }] } })) > 0;
  },
  async create(input, actorId) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.facility.create({ data: createData(input), select: selection });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CONFIG_CHANGE',
          module: 'facility',
          facilityId: row.id,
          target: row.code,
          diff: { created: true },
        },
      });
      return view(row);
    });
  },
  async update(id, changes, actorId, diff) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.facility.update({ where: { id }, data: updateData(changes), select: selection });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CONFIG_CHANGE',
          module: 'facility',
          facilityId: id,
          target: row.code,
          diff: diff as Prisma.InputJsonObject,
        },
      });
      return view(row);
    });
  },
  async passwordHash(actorId) {
    const user = await prisma.adminUser.findUnique({
      where: { id: actorId },
      select: { passwordHash: true },
    });
    return user?.passwordHash ?? null;
  },
  async recordHealth(id, health, at, durationMs, error) {
    await prisma.$transaction(async (tx) => {
      await tx.facility.update({ where: { id }, data: { health, ...(at ? { lastOkAt: at } : {}) } });
      await tx.syncLog.create({
        data: { facilityId: id, job: 'HEALTH', ok: health === 'OK', durationMs, error },
      });
    });
  },
  async activeIds() {
    return (
      await prisma.facility.findMany({ where: { status: 'ACTIVE' }, select: { id: true }, take: 1000 })
    ).map((r) => r.id);
  },
};
