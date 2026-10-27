import type { Prisma } from '@prisma/client';
import type { AccountRecord } from '@/lib/domain/account/ports';
import type { PatientRepository, SearchFilter } from '@/lib/domain/ports';
import { prisma } from './prisma';

const scoped = (ids: string[] | null): Prisma.PatientAccountWhereInput =>
  ids === null ? {} : { appointments: { some: { facilityId: { in: ids } } } };

function searchWhere(f: SearchFilter): Prisma.PatientAccountWhereInput {
  const match: Prisma.PatientAccountWhereInput =
    f.kind === 'cccd'
      ? { cccdHmac: f.value }
      : f.kind === 'phone'
        ? { phoneHmac: f.value }
        : f.kind === 'code'
          ? {
              appointments: {
                some: { code: f.value, ...(f.facilityIds ? { facilityId: { in: f.facilityIds } } : {}) },
              },
            }
          : f.kind === 'name'
            ? { fullNameNorm: { contains: f.value } }
            : { email: { equals: f.value, mode: 'insensitive' } };
  return { AND: [match, scoped(f.facilityIds)], status: { not: 'DELETED' } };
}

function auditData(
  actorId: string,
  accountId: string,
  action: string,
  reason: string,
  extra?: { evidenceKey?: string; facilityId?: string | null; changed?: string[] },
): Prisma.AuditLogCreateInput {
  return {
    actorType: 'ADMIN',
    actorId,
    target: accountId,
    module: 'PATIENT',
    action,
    facilityId: extra?.facilityId ?? null,
    // A05 mục 2: nhật ký chỉ lưu tên trường và khóa tệp riêng, không lưu giá trị PII.
    diff: {
      reason,
      ...(extra?.evidenceKey ? { evidenceKey: extra.evidenceKey } : {}),
      ...(extra?.changed ? { changed: extra.changed } : {}),
    },
  };
}

export const prismaAdminPatientRepository: PatientRepository = {
  async search(filter) {
    const where = searchWhere(filter);
    const [rows, total] = await Promise.all([
      prisma.patientAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: filter.skip,
        take: filter.take,
      }),
      prisma.patientAccount.count({ where }),
    ]);
    return { rows: rows as AccountRecord[], total };
  },
  async findScoped(id, facilityIds) {
    return prisma.patientAccount.findFirst({
      where: { id, ...scoped(facilityIds) },
    }) as Promise<AccountRecord | null>;
  },
  async cccdExists(hmac, exceptId) {
    return (await prisma.patientAccount.count({ where: { cccdHmac: hmac, id: { not: exceptId } } })) > 0;
  },
  async mutate(id, patch, event) {
    await prisma.$transaction(async (tx) => {
      await tx.patientAccount.update({
        where: { id },
        data: { ...(patch as Prisma.PatientAccountUpdateInput), tokenVersion: { increment: 1 } },
      });
      await tx.auditLog.create({ data: auditData(event.actorId, id, event.action, event.reason, event) });
    });
  },
  async auditView(id, actorId, action, facilityId) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId,
        action,
        module: 'PATIENT',
        target: id,
        facilityId: facilityId ?? null,
      },
    });
  },
  async appointments(id, facilityIds, skip, take) {
    const where: Prisma.AppointmentWhereInput = {
      accountId: id,
      ...(facilityIds ? { facilityId: { in: facilityIds } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        select: {
          id: true,
          code: true,
          facilityId: true,
          examDate: true,
          status: true,
          amount: true,
          createdAt: true,
          facility: { select: { name: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ]);
    return {
      rows: rows.map((r) => ({
        id: r.id,
        code: r.code,
        facilityId: r.facilityId,
        facilityName: r.facility.name,
        examDate: r.examDate,
        status: r.status,
        amountVnd: Number(r.amount),
        createdAt: r.createdAt,
      })),
      total,
    };
  },
  async events(id, facilityIds) {
    const rows = await prisma.auditLog.findMany({
      where: {
        OR: [
          { actorType: 'PATIENT', actorId: id },
          { actorType: 'ADMIN', target: id },
        ],
        ...(facilityIds ? { facilityId: { in: facilityIds } } : {}),
      },
      select: { action: true, module: true, at: true, actorType: true },
      orderBy: { at: 'desc' },
      take: 50,
    });
    return rows;
  },
  async pendingDeletion(id) {
    const [request, processed] = await Promise.all([
      prisma.auditLog.findFirst({
        where: { actorType: 'PATIENT', actorId: id, module: 'PRIVACY', action: 'DELETE_REQUEST' },
        orderBy: { at: 'desc' },
        select: { at: true },
      }),
      prisma.auditLog.findFirst({
        where: { actorType: 'ADMIN', target: id, module: 'PRIVACY', action: 'DELETE_PROCESSED' },
        orderBy: { at: 'desc' },
        select: { at: true },
      }),
    ]);
    return request && (!processed || request.at > processed.at) ? request.at : null;
  },
  async anonymize(id, patch, actorId, reason) {
    await prisma.$transaction(async (tx) => {
      await tx.patientAccount.update({
        where: { id },
        data: { ...(patch as Prisma.PatientAccountUpdateInput), tokenVersion: { increment: 1 } },
      });
      await tx.auditLog.create({
        data: { ...auditData(actorId, id, 'DELETE_PROCESSED', reason), module: 'PRIVACY' },
      });
    });
  },
};
