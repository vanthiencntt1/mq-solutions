import type { AdminRepository } from '@/lib/domain/admin/ports';
import { prisma } from './prisma';

const userInclude = { role: { select: { name: true, permissions: true } } } as const;

export const prismaAdminRepository: AdminRepository = {
  findByEmail: (email) => prisma.adminUser.findUnique({ where: { email }, include: userInclude }),
  findById: (id) => prisma.adminUser.findUnique({ where: { id }, include: userInclude }),
  async updateLogin(id, data) {
    await prisma.adminUser.update({ where: { id }, data });
  },
  async recordFailure(id, now) {
    // A01 mục 1: increment tại DB để các lần thử song song không ghi đè bộ đếm.
    const user = await prisma.adminUser.update({
      where: { id },
      data: { failedCount: { increment: 1 } },
      select: { failedCount: true },
    });
    if (user.failedCount < 5) return false;
    await prisma.adminUser.update({
      where: { id },
      data: { failedCount: 0, lockedUntil: new Date(now.getTime() + 15 * 60_000) },
    });
    return true;
  },
  async updatePassword(id, passwordHash) {
    await prisma.adminUser.update({ where: { id }, data: { passwordHash } });
  },
  async updateTotp(id, totpSecretEnc) {
    await prisma.adminUser.update({ where: { id }, data: { totpSecretEnc } });
  },
  async createSession(data) {
    await prisma.adminSession.create({ data });
  },
  findSession: (tokenHash) =>
    prisma.adminSession.findUnique({ where: { tokenHash }, include: { user: { include: userInclude } } }),
  async revokeSession(tokenHash, revokedAt) {
    await prisma.adminSession.update({ where: { tokenHash }, data: { revokedAt } });
  },
  async revokeUserSessions(userId, revokedAt) {
    await prisma.adminSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt } });
  },
  async audit(data) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: data.actorId,
        action: data.action,
        module: 'auth',
        facilityId: data.facilityId,
        target: data.target,
        ipHash: data.ipHash,
      },
    });
  },
};
