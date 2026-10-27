import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { ok, parseWith, route } from '@/lib/http/api';
import { TemplateCodeSchema, TemplateEditSchema } from '@/lib/services/notification/templates';
import { getNotificationService } from '@/lib/services/notification';

const Schema = TemplateEditSchema.extend({ code: TemplateCodeSchema });

export const POST = route(async (req) => {
  await requireAdminApi(req, PERMISSIONS.NOTIFICATION_READ);
  const input = parseWith(Schema, await req.json());
  return ok(getNotificationService().preview(input.code, input.subject, input.bodyJson));
});
