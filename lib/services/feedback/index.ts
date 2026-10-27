import { prismaFeedbackRepository } from '@/lib/infra/db/feedback-repository';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { FeedbackService } from './feedback-service';

let instance: FeedbackService | undefined;

export function getFeedbackService(): FeedbackService {
  instance ??= new FeedbackService({
    repo: prismaFeedbackRepository,
    limiter: redisRateLimiter,
    mailer: smtpMailer,
  });
  return instance;
}
