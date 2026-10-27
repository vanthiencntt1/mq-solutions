import { prisma } from '@/lib/infra/db/prisma';
import { AppError } from '@/lib/domain/errors';
import { HisClient, type HisConnection } from './client';

// Cache cấu hình kết nối 60 giây: đổi URL trong admin có hiệu lực ≤ 60 giây (A02 mục 3).
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; conn: HisConnection }>();

async function loadConnection(facilityId: string): Promise<HisConnection> {
  const hit = cache.get(facilityId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.conn;
  const f = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: {
      id: true,
      code: true,
      apiBaseUrl: true,
      partnerCode: true,
      secretRef: true,
      timeoutMs: true,
      status: true,
    },
  });
  if (!f) throw new AppError('NOT_FOUND', 'Không tìm thấy cơ sở');
  if (f.status !== 'ACTIVE') throw new AppError('FACILITY_PAUSED');
  const conn: HisConnection = {
    facilityId: f.id,
    code: f.code,
    apiBaseUrl: f.apiBaseUrl,
    partnerCode: f.partnerCode,
    secretRef: f.secretRef,
    timeoutMs: f.timeoutMs,
  };
  cache.set(facilityId, { at: Date.now(), conn });
  return conn;
}

export const hisClient = new HisClient(loadConnection);
export { HisClient } from './client';

// A02 mục 3: xóa bản trong tiến trình khi admin đổi cấu hình; tiến trình khác tự hết hạn sau 60 giây.
export function invalidateFacilityConnection(facilityId: string): void {
  cache.delete(facilityId);
}

// A02 mục 2: kiểm tra cả cơ sở PAUSED/INACTIVE trước khi bật; luôn dùng cấu hình DB mới nhất.
export const facilityProbeClient = new HisClient(async (facilityId) => {
  const f = await prisma.facility.findUnique({
    where: { id: facilityId },
    select: { id: true, code: true, apiBaseUrl: true, partnerCode: true, secretRef: true, timeoutMs: true },
  });
  if (!f) throw new AppError('NOT_FOUND');
  return { facilityId: f.id, code: f.code, apiBaseUrl: f.apiBaseUrl, partnerCode: f.partnerCode, secretRef: f.secretRef, timeoutMs: f.timeoutMs };
});
