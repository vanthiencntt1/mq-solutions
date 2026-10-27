import { z } from 'zod';
import { requireAdminApi } from '@/app/_lib/admin-session';
import { requestCtx } from '@/app/_lib/session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminCatalogService } from '@/lib/services/admin-catalog';

const clearSchema = z.object({ facility: z.string().min(1).max(40) });

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CATALOG_CLEAR);
  const { facility } = parseWith(clearSchema, await req.json());
  await getAdminCatalogService().clear(admin, facility, requestCtx(req).ipHash);
  return ok({ cleared: true });
});
