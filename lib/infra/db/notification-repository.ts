import type { NotificationRepository, NewNotification, TemplateCode } from '@/lib/domain/ports';
import { prisma } from './prisma';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  link: true,
  readAt: true,
  createdAt: true,
} as const;

export const prismaNotificationRepository: NotificationRepository = {
  async getTemplate(code) {
    const row = await prisma.emailTemplate.findUnique({ where: { code } });
    return row ? { ...row, code: code as TemplateCode, bodyJson: row.bodyJson as { text: string } } : null;
  },
  async listTemplates() {
    const rows = await prisma.emailTemplate.findMany();
    return rows.map((row) => ({
      ...row,
      code: row.code as TemplateCode,
      bodyJson: row.bodyJson as { text: string },
    }));
  },
  async saveTemplate(row, adminId) {
    await prisma.emailTemplate.upsert({
      where: { code: row.code },
      create: { code: row.code, subject: row.subject, bodyJson: row.bodyJson, updatedBy: adminId },
      update: { subject: row.subject, bodyJson: row.bodyJson, updatedBy: adminId },
    });
  },
  async logEmail(template, toHash, status) {
    await prisma.emailLog.create({ data: { template, toHash, status } });
  },
  async listEmailLogs(page, pageSize) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const [rows, total, todayCount] = await Promise.all([
      prisma.emailLog.findMany({
        select: { id: true, template: true, toHash: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.emailLog.count(),
      prisma.emailLog.count({ where: { status: 'SENT', createdAt: { gte: today } } }),
    ]);
    return { rows, total, today: todayCount };
  },
  async list(accountId, page, pageSize) {
    const where = { accountId };
    const [rows, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        select: notificationSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.notification.count({ where }),
    ]);
    return { rows, total };
  },
  unreadCount: (accountId) => prisma.notification.count({ where: { accountId, readAt: null } }),
  async create(accountId, input) {
    await prisma.notification.create({ data: { accountId, ...input } });
  },
  async markRead(accountId, id, at) {
    const found = await prisma.notification.findFirst({ where: { id, accountId }, select: { id: true } });
    if (!found) return false;
    await prisma.notification.updateMany({ where: { id, accountId, readAt: null }, data: { readAt: at } });
    return true;
  },
  async broadcast(input: NewNotification, facilityId: string | null) {
    // A08 mục 2: duyệt theo trang để không giữ toàn bộ tài khoản trong bộ nhớ.
    let cursor: string | undefined;
    let count = 0;
    while (true) {
      const accounts = await prisma.patientAccount.findMany({
        where: { status: 'ACTIVE', ...(facilityId ? { appointments: { some: { facilityId } } } : {}) },
        select: { id: true },
        orderBy: { id: 'asc' },
        take: 500,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!accounts.length) break;
      await prisma.notification.createMany({
        data: accounts.map((account) => ({ accountId: account.id, ...input })),
      });
      count += accounts.length;
      cursor = accounts.at(-1)?.id;
    }
    return count;
  },
  facilities: (scope) =>
    prisma.facility.findMany({
      where: scope ? { id: { in: scope } } : {},
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 500,
    }),
  facilityExists: async (id) =>
    Boolean(await prisma.facility.findUnique({ where: { id }, select: { id: true } })),
};
