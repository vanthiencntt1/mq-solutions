import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

function changes(before: unknown, after: object): Record<string, { from: unknown; to: unknown }> {
  const old =
    before && typeof before === 'object' && !Array.isArray(before) ? (before as Record<string, unknown>) : {};
  const next = after as Record<string, unknown>;
  return Object.fromEntries(
    [...new Set([...Object.keys(old), ...Object.keys(next)])]
      .filter((field) => JSON.stringify(old[field]) !== JSON.stringify(next[field]))
      .map((field) => [field, { from: old[field] ?? null, to: next[field] ?? null }]),
  );
}

export const prismaSettingsRepository = {
  async list() {
    return prisma.systemSetting.findMany({ select: { key: true, value: true } });
  },
  async save(key: string, value: object, actorId: string): Promise<boolean> {
    // A11 mục 2: khóa theo hàng trong giao dịch serializable để diff luôn gắn với lần ghi tương ứng.
    return prisma.$transaction(
      async (tx) => {
        const previous = await tx.systemSetting.findUnique({ where: { key }, select: { value: true } });
        const diff = changes(previous?.value, value);
        if (Object.keys(diff).length === 0) return false;
        await tx.systemSetting.upsert({
          where: { key },
          create: { key, value: value as Prisma.InputJsonValue, updatedBy: actorId },
          update: { value: value as Prisma.InputJsonValue, updatedBy: actorId },
        });
        await tx.auditLog.create({
          data: {
            actorType: 'ADMIN',
            actorId,
            action: 'CONFIG_CHANGE',
            module: 'settings',
            target: key,
            diff: diff as Prisma.InputJsonValue,
          },
        });
        return true;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  },
};
