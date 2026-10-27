import type { Metadata } from 'next';
import { requireAdminPage } from '@/app/_lib/admin-session';
import { AdminUsersPanel } from '@/components/features/admin/users/admin-users-panel';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminUserListSchema } from '@/lib/domain/admin/schemas';
import { getAdminUsersService } from '@/lib/services/admin-users';

export const metadata: Metadata = { title: 'Người dùng admin' };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const admin = await requireAdminPage(PERMISSIONS.STAFF_MANAGE);
  const query = AdminUserListSchema.parse(await searchParams);
  const service = getAdminUsersService();
  const [result, options] = await Promise.all([
    service.list(admin, query.page, query.pageSize),
    service.options(admin),
  ]);
  return (
    <AdminUsersPanel
      rows={result.rows}
      total={result.total}
      page={query.page}
      pageSize={query.pageSize}
      roles={options.roles}
      facilities={options.facilities}
      manager={admin.role === 'FACILITY_MANAGER'}
    />
  );
}
