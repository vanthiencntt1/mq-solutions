import { z } from 'zod';
import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AdminContentIdSchema, AdminContentKindSchema } from '@/lib/domain/content/admin-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminContentService } from '@/lib/services/admin-content';

type Context = { params: Promise<{ kind: string; id: string }> };
export const POST = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  const params = await ctx.params;
  const kind = parseWith(AdminContentKindSchema, params.kind);
  const { id } = parseWith(AdminContentIdSchema, params);
  const { versionId } = parseWith(z.object({ versionId: z.uuid() }), await req.json());
  return ok(await getAdminContentService().restore(actor, kind, id, versionId));
});
