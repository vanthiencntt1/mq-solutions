import { getEnv } from '@/lib/config/env';
import { AppError } from '@/lib/domain/errors';
import { prismaTicketRepository } from '@/lib/infra/db/ticket-repository';
import { hisClient } from '@/lib/infra/his';
import { getRedis } from '@/lib/infra/redis/client';
import { getIdentityService } from '@/lib/services/identity';
import { getNotificationService } from '@/lib/services/notification';
import { TicketService } from './ticket-service';

let instance: TicketService | undefined;

export function getTicketService(): TicketService {
  if (!instance) {
    const notification = getNotificationService();
    instance = new TicketService({
      repo: prismaTicketRepository,
      his: hisClient,
      identity: getIdentityService(),
      notify: notification,
      qrSecret: getEnv().PII_HMAC_SECRET,
      now: () => new Date(),
      async withCancelLock(code, action) {
        const redis = getRedis();
        const key = `ticket:cancel:${code}`;
        const token = crypto.randomUUID();
        if ((await redis.set(key, token, 'EX', 30, 'NX')) !== 'OK') throw new AppError('BOOKING_IN_PROGRESS');
        try {
          return await action();
        } finally {
          await redis.eval(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            1,
            key,
            token,
          );
        }
      },
    });
  }
  return instance;
}

export { TicketService } from './ticket-service';
