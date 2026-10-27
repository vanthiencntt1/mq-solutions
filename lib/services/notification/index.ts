import { createHmac } from 'node:crypto';
import { Queue } from 'bullmq';
import { getEnv } from '@/lib/config/env';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { prismaNotificationRepository } from '@/lib/infra/db/notification-repository';
import { getRedis } from '@/lib/infra/redis/client';
import { NotificationService } from './notification-service';
import type { EmailJob } from './types';

let instance: NotificationService | undefined;
let emailQueue: Queue<EmailJob> | undefined;

export function getNotificationService(): NotificationService {
  if (!instance)
    instance = new NotificationService({
      repo: prismaNotificationRepository,
      mailer: smtpMailer,
      queue: {
        add: async (job) => {
          emailQueue ??= new Queue<EmailJob>('email', { connection: getRedis() });
          await emailQueue.add('send-email', job, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 15_000 },
            removeOnComplete: true,
            removeOnFail: { age: 86_400 },
          });
        },
      },
      hashEmail: (email) =>
        createHmac('sha256', getEnv().PII_HMAC_SECRET).update(email.trim().toLowerCase()).digest('hex'),
      now: () => new Date(),
    });
  return instance;
}

export { NotificationService } from './notification-service';
