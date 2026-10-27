import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import {
  AdminContentIdSchema,
  AdminContentKindSchema,
  parseAdminContentInput,
} from '@/lib/domain/content/admin-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminContentService } from '@/lib/services/admin-content';

type Context = { params: Promise<{ kind: string; id: string }> };
async function parameters(ctx: Context) {
  const params = await ctx.params;
  return {
    kind: parseWith(AdminContentKindSchema, params.kind),
    id: parseWith(AdminContentIdSchema, params).id,
  };
}

export const GET = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_READ);
  const { kind, id } = await parameters(ctx);
  return ok(await getAdminContentService().get(actor, kind, id));
});
export const PATCH = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  const { kind, id } = await parameters(ctx);
  const input = parseAdminContentInput(kind, await req.json());
  return ok(await getAdminContentService().save(actor, input, id));
});
export const DELETE = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  const { kind, id } = await parameters(ctx);
  await getAdminContentService().remove(actor, kind, id);
  return ok({ deleted: true });
});
