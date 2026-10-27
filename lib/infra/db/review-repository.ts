import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/domain/errors';
import type { ReviewRepository } from '@/lib/domain/ports';
import { prisma } from './prisma';

export const prismaReviewRepository: ReviewRepository = {
  appointment: (id, accountId) =>
    prisma.appointment.findFirst({ where: { id, accountId }, select: { facilityId: true, status: true } }),
  async create(input) {
    try {
      return await prisma.review.create({ data: input, select: { id: true, status: true } });
    } catch (error) {
      // A09 mục 1: UNIQUE appointmentId là chốt chặn cuối cho hai yêu cầu đồng thời.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new AppError('REVIEW_ALREADY_EXISTS');
      throw error;
    }
  },
  async facilityIdByCode(code) {
    return (await prisma.facility.findUnique({ where: { code }, select: { id: true } }))?.id ?? null;
  },
  published: (facilityId, skip, take) =>
    prisma.review.findMany({
      where: { facilityId, status: 'SHOWN' },
      select: { id: true, rating: true, comment: true, reply: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
    }),
  async summary(facilityId) {
    const aggregate = await prisma.review.aggregate({
      where: { facilityId, status: 'SHOWN' },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return { average: aggregate._avg.rating ?? 0, count: aggregate._count._all };
  },
};
