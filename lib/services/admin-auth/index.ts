import { createHmac, randomBytes } from 'node:crypto';
import { authenticator } from 'otplib';
import { getEnv } from '@/lib/config/env';
import { argon2Hasher } from '@/lib/infra/auth/password-hasher';
import { encryptPii, decryptPii } from '@/lib/infra/crypto/pii';
import { prismaAdminRepository } from '@/lib/infra/db/admin-auth-repository';
import { getRedis } from '@/lib/infra/redis/client';
import { redisRateLimiter } from '@/lib/infra/redis/rate-limiter';
import { AdminAuthService } from './admin-auth-service';

let instance: AdminAuthService | undefined;

export function getAdminAuthService(): AdminAuthService {
  if (!instance) {
    const env = getEnv();
    instance = new AdminAuthService({
      repo: prismaAdminRepository,
      hasher: argon2Hasher,
      totp: {
        generate: () => authenticator.generateSecret(),
        verify: (code, secret) => authenticator.check(code, secret),
        uri: (email, secret) => authenticator.keyuri(email, 'MQ Solutions', secret),
      },
      cipher: {
        encrypt: (value) => encryptPii(value, env.PII_SECRET),
        decrypt: (value) => decryptPii(value, env.PII_SECRET),
      },
      session: {
        createToken: () => randomBytes(32).toString('base64url'),
        hashToken: (token) => createHmac('sha256', env.ADMIN_SESSION_SECRET).update(token).digest('hex'),
        getIdle: async (hash) => (await getRedis().exists(`admin:idle:${hash}`)) === 1,
        touchIdle: async (hash) => {
          await getRedis().set(`admin:idle:${hash}`, '1', 'EX', 30 * 60);
        },
        clearIdle: async (hash) => {
          await getRedis().del(`admin:idle:${hash}`);
        },
      },
      limiter: redisRateLimiter,
      now: () => new Date(),
    });
  }
  return instance;
}

export { AdminAuthService } from './admin-auth-service';
export type { AdminPrincipal, AdminLoginResult } from './admin-auth-service';
