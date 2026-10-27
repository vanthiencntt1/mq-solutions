import { getRedis, cacheKeys } from '@/lib/infra/redis/client';
import type { PaymentHoldStore, PaymentRecord } from '@/lib/domain/payment/ports';

function holdKey(row: PaymentRecord): string {
  return cacheKeys.slotHold(row.facilityCode, String(row.roomHisId), row.examDate, row.bookingNumber);
}

/**
 * `booking:draft-of:<mã>` được ghi qua lớp cache (JSON.stringify → có dấu ngoặc kép),
 * còn khóa giữ số `slot:*` lưu chuỗi thô. Phải giải JSON trước khi so, nếu không
 * mọi khoản thanh toán đúng hạn bị coi là "số đã có người giữ" → chuyển sang hoàn tiền.
 */
export async function draftIdOf(code: string): Promise<string | null> {
  const raw = await getRedis().get(`booking:draft-of:${code}`);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'string' ? parsed : raw;
  } catch {
    return raw;
  }
}

export const redisPaymentHolds: PaymentHoldStore = {
  async slotAvailable(row) {
    const redis = getRedis();
    const key = holdKey(row);
    const originalDraft = await draftIdOf(row.code);
    const current = await redis.get(key);
    if (current && current !== originalDraft && current !== row.code) return false;
    if (current) return true;
    // C07 mục 4: khi tiền đến muộn, chiếm lại đúng số cũ nếu chưa có người khác giữ.
    return (await redis.set(key, row.code, 'EX', 15 * 60, 'NX')) === 'OK';
  },
  async release(row) {
    const redis = getRedis();
    const key = holdKey(row);
    const originalDraft = await draftIdOf(row.code);
    // Chỉ xóa khóa còn thuộc phiếu này; không nhả số đã được người khác giữ.
    await redis.eval(
      "local v=redis.call('get', KEYS[1]); if v==ARGV[1] or (ARGV[2]~='' and v==ARGV[2]) then return redis.call('del', KEYS[1]) end; return 0",
      1,
      key,
      row.code,
      originalDraft ?? '',
    );
  },
};
