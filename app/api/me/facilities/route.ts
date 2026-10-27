import { ok, route } from '@/lib/http/api';
import { getIdentityService } from '@/lib/services/identity';
import { requireApiSession } from '@/app/_lib/session';

export const dynamic = 'force-dynamic';

// GET /api/me/facilities – cơ sở đã từng đặt khám, để vào nhanh (C03 mục 7).
export const GET = route(async (req) => {
  const s = await requireApiSession(req);
  return ok(await getIdentityService().listMyFacilities(s.id));
});
