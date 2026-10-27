import { z } from 'zod';
import { requireAdminApi } from '@/app/_lib/admin-session';
import { PERMISSIONS } from '@/lib/domain/admin/permissions';
import { AppError } from '@/lib/domain/errors';
import { ok, parseWith, route } from '@/lib/http/api';
import { getAdminContentService } from '@/lib/services/admin-content';

export const runtime = 'nodejs';
export const POST = route(async (req) => {
  const actor = await requireAdminApi(req, PERMISSIONS.CONTENT_WRITE);
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) throw new AppError('VALIDATION_FAILED', 'Vui lòng chọn ảnh');
  const alt = parseWith(z.string().trim().min(1).max(300), form.get('alt'));
  return ok(
    await getAdminContentService().upload(actor, Buffer.from(await file.arrayBuffer()), file.type, alt),
    undefined,
    { status: 201 },
  );
});
