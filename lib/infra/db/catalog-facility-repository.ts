import type { CatalogFacilityReader } from '@/lib/domain/booking/schedule';
import { prisma } from './prisma';

const selection = {
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
  findByCode: (code) => prisma.facility.findUnique({ where: { code }, select: selection }),
  list: () =>
    prisma.facility.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      take: 100,
      select: selection,
    }),
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
