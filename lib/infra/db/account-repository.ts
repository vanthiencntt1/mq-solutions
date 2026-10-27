import type {
  AccountRecord,
  AccountRepository,
  AuditWriter,
  EmailLogWriter,
} from '@/lib/domain/account/ports';
import { logger } from '@/lib/infra/logger';
import { prisma } from './prisma';

// Repository bảng patient_account (Prisma). Model Prisma khớp AccountRecord theo tên trường.
export const prismaAccountRepository: AccountRepository = {
  findById: (id) => prisma.patientAccount.findUnique({ where: { id } }) as Promise<AccountRecord | null>,
  findByCccdHmac: (cccdHmac) =>
    prisma.patientAccount.findUnique({ where: { cccdHmac } }) as Promise<AccountRecord | null>,
  findByPhoneHmac: (phoneHmac) =>
    prisma.patientAccount.findMany({ where: { phoneHmac }, take: 5 }) as Promise<AccountRecord[]>,
  create: (data) => prisma.patientAccount.create({ data }) as Promise<AccountRecord>,
  update: (id, patch) => {
    const { id: _id, createdAt: _c, ...data } = patch;
    return prisma.patientAccount.update({ where: { id }, data }) as Promise<AccountRecord>;
  },
  bumpTokenVersion: (id, patch = {}) => {
    const { id: _id, createdAt: _c, tokenVersion: _tv, ...data } = patch;
    return prisma.patientAccount.update({
      where: { id },
      data: { ...data, tokenVersion: { increment: 1 } },
    }) as Promise<AccountRecord>;
  },
  hardDelete: async (id) => {
    await prisma.patientAccount.delete({ where: { id } });
  },
};

// Nhật ký thao tác (audit_log) – lỗi ghi nhật ký không được làm hỏng nghiệp vụ chính.
export const prismaAuditWriter: AuditWriter = {
  async write(e) {
    await prisma.auditLog
      .create({
        data: {
          actorType: e.actorType,
          actorId: e.actorId,
          action: e.action,
          module: e.module,
          target: e.target,
          ipHash: e.ipHash,
          ...(e.diff ? { diff: e.diff as object } : {}),
        },
      })
      .catch((err: Error) => logger.error({ err: err.message, action: e.action }, 'audit.write_failed'));
  },
};

export const prismaEmailLog: EmailLogWriter = {
  async log(template, toHash, status, error) {
    await prisma.emailLog
      .create({ data: { template, toHash, status, error } })
      .catch((err: Error) => logger.error({ err: err.message }, 'email_log.write_failed'));
  },
};
