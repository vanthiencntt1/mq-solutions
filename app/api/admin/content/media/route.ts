import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminContentListSchema } from '@/lib/domain/content/admin-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminContentService } from '@/lib/services/admin-content';

export const GET = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_READ);
  const { page, pageSize } = parseWith(
    AdminContentListSchema,
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const { rows, total } = await getAdminContentService().media(actor, page, pageSize);
  return ok(rows, { page, pageSize, total });
});
