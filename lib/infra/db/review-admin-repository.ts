import type { AdminReviewRepository, AdminReviewRow, ContactRow } from '@/lib/domain/ports';
import { prisma } from './prisma';

const reviewSelect = {
  id: true,
  facilityId: true,
  facility: { select: { name: true } },
  rating: true,
  comment: true,
  status: true,
  reply: true,
  createdAt: true,
} as const;

function reviewView(row: {
  id: string;
  facilityId: string;
  facility: { name: string };
  rating: number;
  comment: string | null;
  status: string;
  reply: string | null;
  createdAt: Date;
}): AdminReviewRow {
  const { facility, ...rest } = row;
  return { ...rest, facilityName: facility.name };
}

export const prismaAdminReviewRepository: AdminReviewRepository = {
  async listReviews(query, facilityIds) {
    const where = {
      facilityId: query.facilityId ?? (facilityIds === null ? undefined : { in: facilityIds }),
      rating: query.rating,
      status: query.status,
    };
    const [rows, total] = await Promise.all([
      prisma.review.findMany({
        where,
        select: reviewSelect,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.review.count({ where }),
    ]);
    return { rows: rows.map(reviewView), total };
  },
  async findReview(id, facilityIds) {
    const row = await prisma.review.findFirst({
      where: { id, ...(facilityIds === null ? {} : { facilityId: { in: facilityIds } }) },
      select: reviewSelect,
    });
    return row ? reviewView(row) : null;
  },
  async updateReview(id, input) {
    return reviewView(await prisma.review.update({ where: { id }, data: input, select: reviewSelect }));
  },
  facilities: (ids) =>
    prisma.facility.findMany({
      where: ids === null ? {} : { id: { in: ids } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  async listContacts(query) {
    const where = { status: query.status };
    const [rows, total] = await Promise.all([
      prisma.contactLead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.contactLead.count({ where }),
    ]);
    return { rows: rows satisfies ContactRow[], total };
  },
  findContact: (id) => prisma.contactLead.findUnique({ where: { id } }),
  updateContact: (id, input) => prisma.contactLead.update({ where: { id }, data: input }),
  async assigneeExists(id) {
    return (await prisma.adminUser.count({ where: { id, active: true } })) > 0;
  },
  assignees: () =>
    prisma.adminUser.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  async audit(input) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: input.actorId,
        action: input.action,
        module: 'review-contact',
        facilityId: input.facilityId,
        target: input.target,
      },
    });
  },
};
