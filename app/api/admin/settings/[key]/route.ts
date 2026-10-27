import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { parseWith, ok, route } from '@/lib/http/api';
import { getSettingsService } from '@/lib/services/settings';
import { settingKeySchema } from '@/lib/services/settings/schemas';

type Context = { params: Promise<{ key: string }> };

export const PATCH = route<Context>(async (req, context) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CONFIG_UPDATE);
  const { key: rawKey } = await context.params;
  const key = parseWith(settingKeySchema, rawKey);
  const input: unknown = await req.json();
  return ok(await getSettingsService().update(admin, key, input));
});
