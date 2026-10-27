import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminContentIdSchema, AdminContentKindSchema } from '@/lib/domain/content/admin-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminContentService } from '@/lib/services/admin-content';

type Context = { params: Promise<{ kind: string; id: string }> };
export const GET = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_READ);
  const params = await ctx.params;
  const kind = parseWith(AdminContentKindSchema, params.kind);
  const { id } = parseWith(AdminContentIdSchema, params);
  return ok(await getAdminContentService().versions(actor, kind, id));
});
