import { describe, expect, it } from 'vitest';
import type { AdminUserDeps, AdminUserRow } from '@/lib/domain/admin/ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { AdminUsersService } from '@/lib/services/admin-users/admin-users-service';

const row: AdminUserRow = {
  id: 'staff-b',
  email: 'staff@example.com',
  name: 'Nhân viên B',
  role: 'FACILITY_STAFF',
  facilityId: 'facility-b',
  facilityName: 'Cơ sở B',
  active: true,
  lockedUntil: null,
  lastLoginAt: null,
};
const manager: AdminPrincipal = {
  id: 'manager-a',
  name: 'Quản lý A',
  role: 'FACILITY_MANAGER',
  facilityIds: ['facility-a'],
  permissions: ['staff:manage'],
};

function service() {
  const changed: string[] = [];
  const d: AdminUserDeps = {
    repo: {
      list: async () => ({ rows: [row], total: 1 }),
      find: async () => row,
      findEmail: async () => false,
      findRole: async (name) => ({ id: name, name }),
      createRole: async () => {},
      listRoles: async () => ['FACILITY_STAFF'],
      listFacilities: async () => [{ id: 'facility-a', name: 'Cơ sở A' }],
      facilityExists: async () => true,
      create: async () => row,
      update: async (_id, data) => {
        changed.push(JSON.stringify(data));
        return row;
      },
      audit: async () => {},
      revokeSessions: async () => {},
    },
    hasher: { hash: async (value) => value },
    totp: { generate: () => 'secret' },
    cipher: { encrypt: (value) => value },
    mailer: { send: async () => {} },
    password: () => 'temporary-password',
    now: () => new Date(),
  };
  return { users: new AdminUsersService(d), changed };
}

describe('A01 quản lý người dùng theo phạm vi', () => {
  it('quản lý cơ sở A không sửa được nhân viên cơ sở B', async () => {
    const { users, changed } = service();
    await expect(users.update(manager, row.id, { active: false })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(users.resetTotp(manager, row.id)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(changed).toEqual([]);
  });
  it('quản lý cơ sở không tạo được người dùng toàn hệ thống', async () => {
    const { users } = service();
    await expect(
      users.create(manager, {
        email: 'new@example.com',
        name: 'Nhân viên',
        role: 'FACILITY_STAFF',
        facilityId: null,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
  it('vai trò tùy chỉnh có staff:manage được dùng quyền quản lý', async () => {
    const { users } = service();
    const actor: AdminPrincipal = {
      id: 'operator',
      name: 'Điều phối',
      role: 'MQ_ADMIN',
      facilityIds: null,
      permissions: ['staff:manage'],
    };
    await expect(users.list(actor, 1, 20)).resolves.toMatchObject({ total: 1 });
  });
});
