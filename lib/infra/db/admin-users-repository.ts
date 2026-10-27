import type { AdminUserRepository, AdminUserRow } from '@/lib/domain/admin/ports';
import { prisma } from './prisma';

const select = {
  id: true,
  email: true,
  name: true,
  active: true,
  facilityId: true,
  lockedUntil: true,
  lastLoginAt: true,
  role: { select: { name: true } },
  facility: { select: { name: true } },
} as const;

type Selected = Awaited<ReturnType<typeof prisma.adminUser.findFirst<{ select: typeof select }>>>;
function view(row: NonNullable<Selected>): AdminUserRow {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role.name,
    facilityId: row.facilityId,
    facilityName: row.facility?.name ?? null,
    active: row.active,
    lockedUntil: row.lockedUntil,
    lastLoginAt: row.lastLoginAt,
  };
}

export const prismaAdminUsersRepository: AdminUserRepository = {
  async list(facilityIds, skip, take, roleName) {
    const where = {
      ...(facilityIds === null ? {} : { facilityId: { in: facilityIds } }),
      ...(roleName ? { role: { name: roleName } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.adminUser.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, select }),
      prisma.adminUser.count({ where }),
    ]);
    return { rows: rows.map(view), total };
  },
  async find(id) {
    const row = await prisma.adminUser.findUnique({ where: { id }, select });
    return row ? view(row) : null;
  },
  async findEmail(email) {
    return (await prisma.adminUser.count({ where: { email } })) > 0;
  },
  findRole: (name) => prisma.adminRole.findUnique({ where: { name }, select: { id: true, name: true } }),
  async createRole(name, permissions) {
    await prisma.adminRole.create({ data: { name, permissions } });
  },
  async listRoles() {
    return (await prisma.adminRole.findMany({ select: { name: true }, orderBy: { name: 'asc' } })).map(
      (r) => r.name,
    );
  },
  listFacilities: (ids) =>
    prisma.facility.findMany({
      where: ids === null ? {} : { id: { in: ids } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 100,
    }),
  async facilityExists(id) {
    return (await prisma.facility.count({ where: { id } })) > 0;
  },
  async create(data) {
    return view(await prisma.adminUser.create({ data, select }));
  },
  async update(id, data) {
    return view(await prisma.adminUser.update({ where: { id }, data, select }));
  },
  async audit(data) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId: data.actorId,
        action: data.action,
        module: 'admin-users',
        facilityId: data.facilityId,
        target: data.target,
      },
    });
  },
  async revokeSessions(userId, revokedAt) {
    await prisma.adminSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt } });
  },
};
