import {
  parseFixedSchedule,
  type CatalogFacility,
  type CatalogFacilityReader,
} from '@/lib/domain/booking/schedule';
import { prisma } from './prisma';

type Row = Omit<CatalogFacility, 'fixedSchedule'> & { fixedSchedule: unknown };
const view = ({ fixedSchedule, ...row }: Row): CatalogFacility => ({
  ...row,
  fixedSchedule: parseFixedSchedule(fixedSchedule),
});

const selection = {
  scheduleSource: true,
  fixedSchedule: true,
  id: true,
  code: true,
  name: true,
  address: true,
  status: true,
  health: true,
  bookingMode: true,
  allowBhyt: true,
  allowSameDay: true,
  payOptions: true,
} as const;

export const prismaCatalogFacilities: CatalogFacilityReader = {
  findByCode: async (code) => {
    const row = await prisma.facility.findUnique({ where: { code }, select: selection });
    return row ? view(row) : null;
  },
  list: async () =>
    (
      await prisma.facility.findMany({
        where: { status: 'ACTIVE' },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        take: 100,
        select: selection,
      })
    ).map(view),
  async warnNoDoctors(facilityId, specialtyHisId) {
    await prisma.syncLog.create({
      data: {
        facilityId,
        job: 'CATALOG',
        ok: false,
        durationMs: 0,
        error: `C05: không có lịch bác sĩ thuộc khoa ${specialtyHisId}`,
      },
    });
  },
};
