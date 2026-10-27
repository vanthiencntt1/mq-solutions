import { randomUUID } from 'node:crypto';
import { hisClient } from '@/lib/infra/his';
import { prismaReconcileRepository } from '@/lib/infra/db/reconcile-repository';
import { logger } from '@/lib/infra/logger';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { CACHE_TTL, cacheKeys, getRedis } from '@/lib/infra/redis/client';
import { ReconcileService } from './reconcile-service';

const releaseScript =
  "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
let instance: ReconcileService | undefined;

export function getReconcileService(): ReconcileService {
  instance ??= new ReconcileService({
    repo: prismaReconcileRepository,
    his: hisClient,
    now: () => new Date(),
    async notifyMismatch(facilityId, examDate, issues, bankDifference) {
      const key = cacheKeys.reconcileAlert(facilityId, examDate);
      let claimed = false;
      try {
        const recipients = await prismaReconcileRepository.alertRecipients(facilityId);
        if (recipients.length === 0) return;
        claimed = (await getRedis().set(key, '1', 'EX', CACHE_TTL.reconcileAlert, 'NX')) === 'OK';
        if (!claimed) return;
        // C09 mục 4: thư chỉ nêu số lệch và đường vào admin; chi tiết phiếu ở màn đã phân quyền.
        for (const to of recipients)
          await smtpMailer.send({
            to,
            subject: `[MQ] Cần kiểm tra đối soát ngày ${examDate}`,
            html: `<p>Đối soát ngày ${examDate} có ${issues} mục lệch và chênh lệch giao dịch ${bankDifference.toLocaleString('vi-VN')}đ.</p><p>Vui lòng xem mục Thanh toán & đối soát trong trang quản trị.</p>`,
          });
      } catch {
        if (claimed) {
          try {
            await getRedis().del(key);
          } catch {
            // TTL tự hết hạn; lỗi gửi thư không được đổi kết quả đối soát đã lưu.
          }
        }
        logger.warn({ facilityId, examDate }, 'a07.reconcile_alert_failed');
      }
    },
    lock: {
      async acquire(facilityId, date) {
        const key = cacheKeys.reconcileLock(facilityId, date);
        const token = randomUUID();
        const acquired = await getRedis().set(key, token, 'EX', CACHE_TTL.reconcileLock, 'NX');
        if (acquired !== 'OK') return null;
        return async () => {
          await getRedis().eval(releaseScript, 1, key, token);
        };
      },
    },
  });
  return instance;
}
