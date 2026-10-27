import type { Mailer } from '@/lib/domain/ports';
import type { AdminRole } from './permissions';

export interface AdminRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  totpSecretEnc: string;
  role: AdminRole;
  facilityId: string | null;
  active: boolean;
  failedCount: number;
  lockedUntil: Date | null;
}

export interface AdminSessionRecord {
  userId: string;
  expiresAt: Date;
  revokedAt: Date | null;
  user: AdminRecord;
}

export interface AdminRepository {
  findByEmail(email: string): Promise<AdminRecord | null>;
  findById(id: string): Promise<AdminRecord | null>;
  updateLogin(
    id: string,
    data: { failedCount: number; lockedUntil: Date | null; lastLoginAt?: Date },
  ): Promise<void>;
  recordFailure(id: string, now: Date): Promise<boolean>;
  updatePassword(id: string, hash: string): Promise<void>;
  updateTotp(id: string, encrypted: string): Promise<void>;
  createSession(data: { userId: string; tokenHash: string; ipHash: string; expiresAt: Date }): Promise<void>;
  findSession(tokenHash: string): Promise<AdminSessionRecord | null>;
  revokeSession(tokenHash: string, at: Date): Promise<void>;
  revokeUserSessions(userId: string, at: Date): Promise<void>;
  audit(data: {
    actorId: string;
    action: string;
    facilityId?: string | null;
    target?: string;
    ipHash?: string;
  }): Promise<void>;
}

export interface AdminAuthDeps {
  repo: AdminRepository;
  hasher: { hash(plain: string): Promise<string>; verify(hash: string, plain: string): Promise<boolean> };
  totp: {
    generate(): string;
    verify(code: string, secret: string): boolean;
    uri(email: string, secret: string): string;
  };
  cipher: { encrypt(value: string): string; decrypt(value: string): string };
  session: {
    createToken(): string;
    hashToken(token: string): string;
    getIdle(hash: string): Promise<boolean>;
    touchIdle(hash: string): Promise<void>;
    clearIdle(hash: string): Promise<void>;
  };
  limiter: { hit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean }> };
  now(): Date;
}

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  facilityId: string | null;
  facilityName: string | null;
  active: boolean;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
}

export interface AdminUserRepository {
  list(
    facilityIds: string[] | null,
    skip: number,
    take: number,
    roleName?: string,
  ): Promise<{ rows: AdminUserRow[]; total: number }>;
  find(id: string): Promise<AdminUserRow | null>;
  findEmail(email: string): Promise<boolean>;
  findRole(name: string): Promise<{ id: string; name: string } | null>;
  createRole(name: string, permissions: string[]): Promise<void>;
  listRoles(): Promise<string[]>;
  listFacilities(facilityIds: string[] | null): Promise<{ id: string; name: string }[]>;
  facilityExists(id: string): Promise<boolean>;
  create(data: {
    email: string;
    name: string;
    passwordHash: string;
    totpSecretEnc: string;
    roleId: string;
    facilityId: string | null;
  }): Promise<AdminUserRow>;
  update(
    id: string,
    data: { roleId?: string; facilityId?: string | null; active?: boolean; totpSecretEnc?: string },
  ): Promise<AdminUserRow>;
  audit(data: { actorId: string; action: string; facilityId: string | null; target: string }): Promise<void>;
  revokeSessions(id: string, at: Date): Promise<void>;
}

export interface AdminUserDeps {
  repo: AdminUserRepository;
  hasher: Pick<AdminAuthDeps['hasher'], 'hash'>;
  totp: Pick<AdminAuthDeps['totp'], 'generate'>;
  cipher: Pick<AdminAuthDeps['cipher'], 'encrypt'>;
  mailer: Mailer;
  password(): string;
  now(): Date;
}
