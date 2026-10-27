import { randomBytes } from 'node:crypto';
import { authenticator } from 'otplib';
import { getEnv } from '@/lib/config/env';
import { argon2Hasher } from '@/lib/infra/auth/password-hasher';
import { encryptPii } from '@/lib/infra/crypto/pii';
import { prismaAdminUsersRepository } from '@/lib/infra/db/admin-users-repository';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { AdminUsersService } from './admin-users-service';

let instance: AdminUsersService | undefined;
export function getAdminUsersService(): AdminUsersService {
  if (!instance) {
    const env = getEnv();
    instance = new AdminUsersService({
      repo: prismaAdminUsersRepository,
      hasher: argon2Hasher,
      totp: { generate: () => authenticator.generateSecret() },
      cipher: { encrypt: (value) => encryptPii(value, env.PII_SECRET) },
      mailer: smtpMailer,
      password: () => randomBytes(18).toString('base64url'),
      now: () => new Date(),
    });
  }
  return instance;
}
export { AdminUsersService } from './admin-users-service';
