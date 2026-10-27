import { z } from 'zod';
import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppError } from '@/lib/domain/errors';
import { ok, parseWith, route } from '@/lib/http/api';
import { getNotificationService } from '@/lib/services/notification';
import { sampleVariables, TemplateCodeSchema } from '@/lib/services/notification/templates';

const Schema = z.object({ code: TemplateCodeSchema, to: z.email() });

export const POST = route(async (req) => {
  const admin = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  if (admin.facilityIds !== null) throw new AppError('FORBIDDEN');
  const input = parseWith(Schema, await req.json());
  await getNotificationService().queueEmail({
    code: input.code,
    to: input.to,
    vars: sampleVariables(input.code),
  });
  return ok({ queued: true });
});
