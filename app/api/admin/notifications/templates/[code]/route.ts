import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppError } from '@/lib/domain/errors';
import { ok, parseWith, route } from '@/lib/http/api';
import { TemplateCodeSchema, TemplateEditSchema } from '@/lib/services/notification/templates';
import { getNotificationService } from '@/lib/services/notification';

export const PATCH = route(async (req, context: { params: Promise<{ code: string }> }) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  if (admin.facilityIds !== null) throw new AppError('FORBIDDEN');
  const code = parseWith(TemplateCodeSchema, (await context.params).code);
  const input = parseWith(TemplateEditSchema, await req.json());
  await getNotificationService().saveTemplate(code, input.subject, input.bodyJson, admin.id);
  return ok({ saved: true });
});
