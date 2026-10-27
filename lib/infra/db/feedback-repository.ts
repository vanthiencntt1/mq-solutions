import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/domain/errors';
import { feedbackStatusSchema, feedbackTopicSchema } from '@/lib/domain/feedback/schemas';
import type { FeedbackRepository } from '@/lib/domain/feedback/ports';
import type { FeedbackRow } from '@/lib/domain/feedback/types';
import { prisma } from './prisma';

interface JoinedRow {
  id: string;
  accountId: string;
  topic: string;
  message: string;
  appointmentId: string | null;
  appointmentCode: string | null;
  facilityId: string | null;
  facilityName: string | null;
  status: string;
  assignee: string | null;
  createdAt: Date;
}

const joinedFeedback = Prisma.sql`
  SELECT f.id, f.account_id AS "accountId", f.topic, f.message,
    f.appointment_id AS "appointmentId", a.code AS "appointmentCode",
    a.facility_id AS "facilityId", facility.name AS "facilityName",
    f.status, f.assignee, f.created_at AS "createdAt"
  FROM feedback f
  LEFT JOIN appointment a ON a.id = f.appointment_id
  LEFT JOIN facility ON facility.id = a.facility_id`;

function view(row: JoinedRow): FeedbackRow {
  return {
    ...row,
    topic: feedbackTopicSchema.parse(row.topic),
    status: feedbackStatusSchema.parse(row.status),
  };
}

async function findJoined(id: string): Promise<FeedbackRow | null> {
  const rows = await prisma.$queryRaw<JoinedRow[]>(
    Prisma.sql`${joinedFeedback} WHERE f.id = ${id}::uuid LIMIT 1`,
  );
  return rows[0] ? view(rows[0]) : null;
}

// Feedback không có relation Appointment trong schema, nên JOIN có tham số để lọc theo cơ sở ngay tại DB.
export const prismaFeedbackRepository: FeedbackRepository = {
  ownAppointment: (id, accountId) =>
    prisma.appointment.findFirst({ where: { id, accountId }, select: { id: true } }),
  async myAppointments(accountId) {
    const rows = await prisma.appointment.findMany({
      where: { accountId },
      select: { id: true, code: true, examDate: true, facility: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map(({ facility, ...row }) => ({ ...row, facilityName: facility.name }));
  },
  async create(accountId, input) {
    const created = await prisma.feedback.create({ data: { accountId, ...input }, select: { id: true } });
    const row = await findJoined(created.id);
    if (!row) throw new AppError('INTERNAL');
    return row;
  },
  async listMine(accountId, query) {
    const skip = (query.page - 1) * query.pageSize;
    const [rows, total] = await Promise.all([
      prisma.$queryRaw<JoinedRow[]>(Prisma.sql`${joinedFeedback}
        WHERE f.account_id = ${accountId}::uuid
        ORDER BY f.created_at DESC, f.id DESC LIMIT ${query.pageSize} OFFSET ${skip}`),
      prisma.feedback.count({ where: { accountId } }),
    ]);
    return { rows: rows.map(view), total };
  },
  async listAdmin(query, scope) {
    if (scope?.length === 0) return { rows: [], total: 0 };
    const clauses: Prisma.Sql[] = [];
    if (query.status) clauses.push(Prisma.sql`f.status = ${query.status}`);
    if (query.facilityId) clauses.push(Prisma.sql`a.facility_id = ${query.facilityId}::uuid`);
    if (scope)
      clauses.push(Prisma.sql`a.facility_id IN (${Prisma.join(scope.map((id) => Prisma.sql`${id}::uuid`))})`);
    const where = clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
    const skip = (query.page - 1) * query.pageSize;
    const [rows, counts] = await Promise.all([
      prisma.$queryRaw<JoinedRow[]>(Prisma.sql`${joinedFeedback} ${where}
        ORDER BY f.created_at DESC, f.id DESC LIMIT ${query.pageSize} OFFSET ${skip}`),
      prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
        SELECT COUNT(*) AS total FROM feedback f
        LEFT JOIN appointment a ON a.id = f.appointment_id ${where}`),
    ]);
    return { rows: rows.map(view), total: Number(counts[0]?.total ?? 0) };
  },
  async findAdmin(id, scope) {
    const row = await findJoined(id);
    if (!row || (scope !== null && (!row.facilityId || !scope.includes(row.facilityId)))) return null;
    return row;
  },
  assignees: (scope) =>
    prisma.adminUser.findMany({
      where: {
        active: true,
        ...(scope === null ? {} : { OR: [{ facilityId: null }, { facilityId: { in: scope } }] }),
      },
      select: { id: true, name: true, facilityId: true },
      orderBy: { name: 'asc' },
      take: 200,
    }),
  async assigneeAllowed(id, facilityId) {
    return (
      (await prisma.adminUser.count({
        where: {
          id,
          active: true,
          ...(facilityId ? { OR: [{ facilityId: null }, { facilityId }] } : { facilityId: null }),
        },
      })) > 0
    );
  },
  async updateAdmin(row, input, actorId) {
    await prisma.$transaction(async (tx) => {
      const updated = await tx.feedback.updateMany({
        where: { id: row.id, status: row.status },
        data: input,
      });
      if (!updated.count) throw new AppError('G2_FEEDBACK_CHANGED');
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'FEEDBACK_UPDATE',
          module: 'feedback',
          facilityId: row.facilityId,
          target: row.id,
          diff: {
            status: { from: row.status, to: input.status ?? row.status },
            ...(input.assignee !== undefined ? { assignee: { from: row.assignee, to: input.assignee } } : {}),
          },
        },
      });
    });
    return {
      ...row,
      status: input.status ?? row.status,
      assignee: input.assignee === undefined ? row.assignee : input.assignee,
    };
  },
  async auditEmailRetry(id, actorId, facilityId) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId,
        action: 'FEEDBACK_EMAIL_RETRY',
        module: 'feedback',
        facilityId,
        target: id,
      },
    });
  },
  async patientEmail(accountId) {
    return (
      (await prisma.patientAccount.findUnique({ where: { id: accountId }, select: { email: true } }))
        ?.email ?? null
    );
  },
};
