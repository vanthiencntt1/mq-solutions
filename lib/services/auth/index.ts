import { randomInt } from 'node:crypto';
import { CONSENT_VERSION } from '@/lib/config/cookies';
import { getEnv } from '@/lib/config/env';
import { jwtTokenIssuer } from '@/lib/infra/auth/patient-token';
import { argon2Hasher } from '@/lib/infra/auth/password-hasher';
import { turnstileVerifier } from '@/lib/infra/captcha/turnstile';
import { hmacPii } from '@/lib/infra/crypto/pii';
import { piiCipher } from '@/lib/infra/crypto/pii-cipher';
import {
  prismaAccountRepository,
  prismaAuditWriter,
  prismaEmailLog,
} from '@/lib/infra/db/account-repository';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { redisRateLimiter, redisTokenVersionCache } from '@/lib/infra/redis/rate-limiter';
import { AuthService } from './auth-service';

// Nối AuthService với hạ tầng thật (Postgres, Redis, Gmail SMTP, Turnstile).
let instance: AuthService | undefined;

export function getAuthService(): AuthService {
  if (!instance) {
    const env = getEnv();
    instance = new AuthService({
      accounts: prismaAccountRepository,
      pii: piiCipher(env.PII_SECRET, env.PII_HMAC_SECRET),
      hasher: argon2Hasher,
      limiter: redisRateLimiter,
      captcha: turnstileVerifier(env.TURNSTILE_SECRET_KEY),
      tokens: jwtTokenIssuer(env.JWT_SECRET),
      tvCache: redisTokenVersionCache,
      mailer: smtpMailer,
      emailLog: prismaEmailLog,
      audit: prismaAuditWriter,
      randomInt: (max) => randomInt(max),
      now: () => new Date(),
      appUrl: env.APP_URL,
      consentVersion: CONSENT_VERSION,
    });
  }
  return instance;
}

/** Băm IP để ghi nhật ký / giới hạn tần suất – không lưu IP rõ. */
export const hashIp = (ip: string) => hmacPii(ip, getEnv().PII_HMAC_SECRET).slice(0, 32);

export { AuthService } from './auth-service';
export type { LoginResult, Profile, SessionAccount } from './auth-service';
