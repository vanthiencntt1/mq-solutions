import { getEnv } from '@/lib/config/env';
import { turnstileVerifier } from '@/lib/infra/captcha/turnstile';
import { prismaContactLeadWriter } from '@/lib/infra/db/content-contact-repository';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { logger } from '@/lib/infra/logger';
import { ContactService } from './contact-service';

let instance: ContactService | undefined;
export function getContactService(): ContactService {
  if (!instance) {
    const env = getEnv();
    instance = new ContactService({
      repo: prismaContactLeadWriter,
      captcha: turnstileVerifier(env.TURNSTILE_SECRET_KEY),
      limiter: redisRateLimiter,
      mailer: smtpMailer,
      salesEmail: env.CONTACT_SALES_EMAIL ?? env.SMTP_FROM,
      onMailFailure: (reason) => logger.warn({ reason }, 'contact.notification_failed'),
    });
  }
  return instance;
}
export { ContactService } from './contact-service';
