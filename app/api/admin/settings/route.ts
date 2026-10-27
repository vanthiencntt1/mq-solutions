import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppError } from '@/lib/domain/errors';
import { ok, route } from '@/lib/http/api';
import { getSettingsSecretStatus, getSettingsService } from '@/lib/services/settings';

export const GET = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CONFIG_UPDATE);
  if (admin.role !== 'SUPER_ADMIN' || admin.facilityIds !== null) throw new AppError('FORBIDDEN');
  return ok({ settings: await getSettingsService().read(), secretStatus: getSettingsSecretStatus() });
});
