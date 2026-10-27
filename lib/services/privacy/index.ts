import { getEnv } from '@/lib/config/env';
import { argon2Hasher } from '@/lib/infra/auth/password-hasher';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import { prisma } from '@/lib/infra/db/prisma';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { PrivacyService, type PrivacyRepository } from './privacy-service';

// C10: audit_log giữ yêu cầu xóa để nhân viên kiểm tra dữ liệu phải lưu theo quy định.
const repository: PrivacyRepository = {
  async findAccount(accountId) {
    return prisma.patientAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        status: true,
        passwordHash: true,
        cccdEnc: true,
        phone: true,
        email: true,
        birthYear: true,
        gender: true,
        consentVersion: true,
        consentAt: true,
        createdAt: true,
      },
    });
  },
  async findDeletionRequest(accountId) {
    const row = await prisma.auditLog.findFirst({
      where: { actorType: 'PATIENT', actorId: accountId, module: 'PRIVACY', action: 'DELETE_REQUEST' },
      orderBy: { at: 'desc' },
      select: { at: true },
    });
    return row?.at ?? null;
  },
  async createDeletionRequest(accountId, ipHash) {
    const row = await prisma.auditLog.create({
      data: {
        actorType: 'PATIENT',
        actorId: accountId,
        module: 'PRIVACY',
        action: 'DELETE_REQUEST',
        ipHash,
        diff: { status: 'PENDING' },
      },
      select: { at: true },
    });
    return row.at;
  },
  async listAppointments(accountId) {
    const items = [];
    let cursor: string | undefined;
    do {
      const page = await prisma.appointment.findMany({
        where: { accountId },
        orderBy: { id: 'asc' },
        take: 100,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        select: {
          id: true,
          code: true,
          examDate: true,
          status: true,
          amount: true,
          createdAt: true,
          facility: { select: { name: true } },
        },
      });
      items.push(
        ...page.map((row) => ({
          code: row.code,
          facility: row.facility.name,
          examDate: row.examDate,
          status: row.status,
          amount: Number(row.amount),
          createdAt: row.createdAt,
        })),
      );
      cursor = page.length === 100 ? page[page.length - 1]?.id : undefined;
    } while (cursor);
    return items;
  },
  async recordExport(accountId, ipHash) {
    await prisma.auditLog.create({
      data: { actorType: 'PATIENT', actorId: accountId, module: 'PRIVACY', action: 'EXPORT', ipHash },
    });
  },
};

let instance: PrivacyService | undefined;

export function getPrivacyService(): PrivacyService {
  if (!instance) {
    const env = getEnv();
    instance = new PrivacyService({
      repository,
      hasher: argon2Hasher,
      pii: piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET),
      limiter: redisRateLimiter,
      now: () => new Date(),
    });
  }
  return instance;
}
