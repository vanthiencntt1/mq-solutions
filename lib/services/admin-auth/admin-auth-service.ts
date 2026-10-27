import { AppError } from '@/lib/domain/errors';
import { can, scopeFacilities, type Permission } from '@/lib/domain/admin/permissions';
import type { AdminAuthDeps, AdminRecord } from '@/lib/domain/admin/ports';
import type { AdminLoginInput, AdminPasswordInput } from '@/lib/domain/admin/schemas';

const SESSION_MS = 8 * 60 * 60_000;
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$LhWBfmTScQ2BOJwwSLbxEQ$l2ymTSLWN6ePrqzj6zslZQdrkLHOJCN45O5YY3p8MD8';

export interface AdminPrincipal {
  id: string;
  role: string;
  facilityIds: string[] | null;
  name: string;
  permissions: readonly string[];
}

export type AdminLoginResult = { kind: 'setup'; uri: string } | { kind: 'authenticated'; token: string };

/** A01 mục 1: DB là nguồn xác thực; Redis chỉ giữ thời gian nhàn rỗi 30 phút. */
export class AdminAuthService {
  constructor(private readonly d: AdminAuthDeps) {}

  async login(input: AdminLoginInput, ipHash: string): Promise<AdminLoginResult> {
    const ip = await this.d.limiter.hit(`admin:login:ip:${ipHash}`, 30, 900);
    const accountKey = this.d.session.hashToken(input.email);
    const accountLimit = await this.d.limiter.hit(`admin:login:account:${accountKey}`, 10, 900);
    if (!ip.allowed || !accountLimit.allowed) throw new AppError('RATE_LIMITED');
    const user = await this.d.repo.findByEmail(input.email);
    if (!user) {
      await this.d.hasher.verify(DUMMY_HASH, input.password);
      throw new AppError('ADMIN_INVALID_CREDENTIALS');
    }
    if (!user.active || (user.lockedUntil && user.lockedUntil > this.d.now()))
      throw new AppError('ADMIN_ACCOUNT_LOCKED');
    if (!(await this.d.hasher.verify(user.passwordHash, input.password))) return this.failLogin(user, ipHash);

    const pending = user.totpSecretEnc.startsWith('pending:');
    const encrypted = pending ? user.totpSecretEnc.slice(8) : user.totpSecretEnc;
    const secret = this.d.cipher.decrypt(encrypted);
    // A01: QR/URI chỉ cấp sau khi mật khẩu đúng; chưa xác nhận TOTP thì chưa tạo phiên.
    if (pending && !input.totp) return { kind: 'setup', uri: this.d.totp.uri(user.email, secret) };
    if (!input.totp || !this.d.totp.verify(input.totp, secret)) return this.failLogin(user, ipHash);
    if (pending) await this.d.repo.updateTotp(user.id, encrypted);

    const now = this.d.now();
    const token = this.d.session.createToken();
    const tokenHash = this.d.session.hashToken(token);
    await this.d.repo.createSession({
      userId: user.id,
      tokenHash,
      ipHash,
      expiresAt: new Date(now.getTime() + SESSION_MS),
    });
    await this.d.session.touchIdle(tokenHash);
    await this.d.repo.updateLogin(user.id, { failedCount: 0, lockedUntil: null, lastLoginAt: now });
    await this.d.repo.audit({ actorId: user.id, action: 'LOGIN', facilityId: user.facilityId, ipHash });
    return { kind: 'authenticated', token };
  }

  async resolve(token: string | undefined, permission?: Permission): Promise<AdminPrincipal | null> {
    if (!token || !/^[A-Za-z0-9_-]{32,128}$/.test(token)) return null;
    const tokenHash = this.d.session.hashToken(token);
    const session = await this.d.repo.findSession(tokenHash);
    if (!session || session.revokedAt || session.expiresAt <= this.d.now() || !session.user.active)
      return null;
    if (!(await this.d.session.getIdle(tokenHash))) return null;
    const user = session.user;
    const facilityIds = scopeFacilities({ role: user.role.name, facilityId: user.facilityId });
    if (facilityIds?.length === 0) throw new AppError('FORBIDDEN');
    if (permission && !can(user.role, permission)) throw new AppError('FORBIDDEN');
    await this.d.session.touchIdle(tokenHash);
    return {
      id: user.id,
      role: user.role.name,
      facilityIds,
      name: user.name,
      permissions: user.role.permissions,
    };
  }

  async logout(token: string | undefined, ipHash: string): Promise<void> {
    if (!token) return;
    const hash = this.d.session.hashToken(token);
    const session = await this.d.repo.findSession(hash);
    if (!session || session.revokedAt) return;
    await this.d.repo.revokeSession(hash, this.d.now());
    await this.d.session.clearIdle(hash);
    await this.d.repo.audit({
      actorId: session.userId,
      action: 'LOGOUT',
      facilityId: session.user.facilityId,
      ipHash,
    });
  }

  async changePassword(userId: string, input: AdminPasswordInput, ipHash: string): Promise<void> {
    const attempt = await this.d.limiter.hit(`admin:password:${userId}`, 5, 900);
    if (!attempt.allowed) throw new AppError('RATE_LIMITED');
    const user = await this.d.repo.findById(userId);
    if (!user || !user.active) throw new AppError('UNAUTHENTICATED');
    if (!(await this.d.hasher.verify(user.passwordHash, input.oldPassword)))
      throw new AppError('ADMIN_WRONG_PASSWORD');
    if (!this.d.totp.verify(input.totp, this.d.cipher.decrypt(user.totpSecretEnc)))
      throw new AppError('ADMIN_INVALID_TOTP');
    if (input.oldPassword === input.newPassword) throw new AppError('ADMIN_PASSWORD_POLICY');
    await this.d.repo.updatePassword(userId, await this.d.hasher.hash(input.newPassword));
    await this.d.repo.revokeUserSessions(userId, this.d.now());
    await this.d.repo.audit({
      actorId: userId,
      action: 'PASSWORD_CHANGE',
      facilityId: user.facilityId,
      ipHash,
    });
  }

  private async failLogin(user: AdminRecord, ipHash: string): Promise<never> {
    const locked = await this.d.repo.recordFailure(user.id, this.d.now());
    await this.d.repo.audit({
      actorId: user.id,
      action: locked ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
      facilityId: user.facilityId,
      ipHash,
    });
    throw new AppError(locked ? 'ADMIN_ACCOUNT_LOCKED' : 'ADMIN_INVALID_CREDENTIALS');
  }
}
