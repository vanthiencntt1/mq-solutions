import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import {
  AdminContentKindSchema,
  AdminContentListSchema,
  parseAdminContentInput,
} from '@/lib/domain/content/admin-schemas';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminContentService } from '@/lib/services/admin-content';

type Context = { params: Promise<{ kind: string }> };
export const GET = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_READ);
  const kind = parseWith(AdminContentKindSchema, (await ctx.params).kind);
  const { page, pageSize } = parseWith(
    AdminContentListSchema,
    Object.fromEntries(new URL(req.url).searchParams),
  );
  const { rows, total } = await getAdminContentService().list(actor, kind, page, pageSize);
  return ok(rows, { page, pageSize, total });
});

export const POST = route<Context>(async (req, ctx) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  const kind = parseWith(AdminContentKindSchema, (await ctx.params).kind);
  const input = parseAdminContentInput(kind, await req.json());
  return ok(await getAdminContentService().save(actor, input), undefined, {
    status: 201,
  });
});
