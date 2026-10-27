import { cccdMatchesBirthYear, cccdMatchesGenderCentury, normalizeName } from '@/lib/domain/account/cccd';
import { checkPasswordPolicy, generateTempPassword } from '@/lib/domain/account/password';
import type { AccountRecord, AuthDeps, SessionClaims } from '@/lib/domain/account/ports';
import type {
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from '@/lib/domain/account/schemas';
import { AppError } from '@/lib/domain/errors';
import { formatDateTime, maskCccd, maskEmail } from '@/lib/utils/format';
import {
  accountCreatedMail,
  emailChangedMail,
  passwordChangedMail,
  passwordResetMail,
  type MailContent,
} from './mail-templates';

// Nghiệp vụ tài khoản bệnh nhân – core/C01. Không phụ thuộc Next.js / Prisma (nhận mọi thứ qua AuthDeps).

export const MAX_FAILED = 5; // sai 5 lần → khóa 15 phút
export const LOCK_MINUTES = 15;
export const CAPTCHA_AFTER = 3; // từ lần sai thứ 3 bắt CAPTCHA

export interface RequestCtx {
  ip?: string;
  ipHash?: string;
}

export interface LoginResult {
  token: string;
  remember: boolean;
  mustChangePassword: boolean;
  fullName: string;
}

export interface SessionAccount {
  id: string;
  fullName: string;
  mustChangePassword: boolean;
  tokenVersion: number;
}

export interface Profile {
  fullName: string;
  birthYear: number;
  gender: number;
  cccdMasked: string;
  phone: string;
  email: string;
  addressLine: string;
  insuranceNoMasked: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export class AuthService {
  constructor(private readonly d: AuthDeps) {}

  // ---------- Đăng ký (C01 mục 4) ----------
  async register(input: RegisterInput, ctx: RequestCtx): Promise<{ emailMasked: string }> {
    await this.limit(`reg:ip:${ctx.ipHash ?? 'x'}`, 5, 3600);
    if (!(await this.d.captcha.verify(input.captchaToken, ctx.ip))) throw new AppError('CAPTCHA_FAILED');
    if (
      !cccdMatchesBirthYear(input.cccd, input.birthYear) ||
      !cccdMatchesGenderCentury(input.cccd, input.birthYear, input.gender)
    ) {
      throw new AppError('ACCOUNT_CCCD_MISMATCH');
    }

    const cccdHmac = this.d.pii.hmac(input.cccd);
    if (await this.d.accounts.findByCccdHmac(cccdHmac)) throw new AppError('ACCOUNT_CCCD_EXISTS');

    const password = generateTempPassword(this.d.randomInt);
    const now = this.d.now();
    const account = await this.d.accounts.create({
      cccdEnc: this.d.pii.encrypt(input.cccd),
      cccdHmac,
      fullName: input.fullName.replace(/\s+/g, ' ').trim(),
      fullNameNorm: normalizeName(input.fullName),
      birthYear: input.birthYear,
      birthDate: null,
      gender: input.gender,
      phone: input.phone,
      phoneHmac: this.d.pii.hmac(input.phone),
      email: input.email,
      addressLine: null,
      insuranceNoEnc: null,
      passwordHash: await this.d.hasher.hash(password),
      mustChangePassword: true,
      consentVersion: this.d.consentVersion,
      consentAt: now,
    });

    const mail = accountCreatedMail({
      fullName: account.fullName,
      cccdMasked: maskCccd(input.cccd),
      password,
      loginUrl: `${this.d.appUrl}/dang-nhap`,
    });
    const sent = await this.sendMail(account.email, mail);
    if (!sent) {
      // Không gửi được mật khẩu thì tài khoản vô dụng → xóa để người dùng đăng ký lại
      await this.d.accounts.hardDelete(account.id);
      throw new AppError('MAIL_SEND_FAILED');
    }
    await this.audit(account.id, 'REGISTER', ctx);
    return { emailMasked: maskEmail(account.email) };
  }

  // ---------- Đăng nhập (C01 mục 5) ----------
  async login(input: LoginInput, ctx: RequestCtx): Promise<LoginResult> {
    const ipCount = await this.limit(`login:ip:${ctx.ipHash ?? 'x'}`, 30, 15 * 60);
    const account = await this.findForLogin(input.username);
    const needCaptcha = (account?.failedCount ?? 0) >= CAPTCHA_AFTER || ipCount > 10;
    if (needCaptcha && !(await this.d.captcha.verify(input.captchaToken, ctx.ip)))
      throw new AppError('CAPTCHA_FAILED');

    const now = this.d.now();
    if (!account || account.status === 'DELETED') {
      await this.d.hasher.verify(DUMMY_HASH, input.password).catch(() => false); // cân thời gian, không lộ tài khoản có tồn tại
      throw new AppError('AUTH_INVALID_CREDENTIALS');
    }
    if (account.status !== 'ACTIVE' || (account.lockedUntil && account.lockedUntil > now)) {
      throw new AppError('AUTH_ACCOUNT_LOCKED');
    }

    if (!(await this.d.hasher.verify(account.passwordHash, input.password))) {
      const failed = account.failedCount + 1;
      await this.d.accounts.update(account.id, {
        failedCount: failed >= MAX_FAILED ? 0 : failed,
        lockedUntil:
          failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : account.lockedUntil,
      });
      await this.audit(account.id, failed >= MAX_FAILED ? 'LOGIN_LOCKED' : 'LOGIN_FAILED', ctx);
      throw new AppError(failed >= MAX_FAILED ? 'AUTH_ACCOUNT_LOCKED' : 'AUTH_INVALID_CREDENTIALS');
    }

    await this.d.accounts.update(account.id, { failedCount: 0, lockedUntil: null, lastLoginAt: now });
    await this.audit(account.id, 'LOGIN', ctx);
    const remember = input.remember ?? false;
    return {
      token: await this.issue(account, remember),
      remember,
      mustChangePassword: account.mustChangePassword,
      fullName: account.fullName,
    };
  }

  // ---------- Đổi mật khẩu (C01 mục 6) ----------
  async changePassword(accountId: string, input: ChangePasswordInput, ctx: RequestCtx): Promise<LoginResult> {
    const account = await this.requireAccount(accountId);
    if (!(await this.d.hasher.verify(account.passwordHash, input.oldPassword)))
      throw new AppError('AUTH_WRONG_PASSWORD');
    const problems = checkPasswordPolicy(input.newPassword, {
      cccd: this.d.pii.decrypt(account.cccdEnc),
      phone: account.phone,
      birthYear: account.birthYear,
      birthDate: account.birthDate,
    });
    if (problems.length) throw new AppError('AUTH_PASSWORD_POLICY', problems.join('. '), { problems });

    const now = this.d.now();
    const updated = await this.d.accounts.bumpTokenVersion(account.id, {
      passwordHash: await this.d.hasher.hash(input.newPassword),
      mustChangePassword: false,
      passwordChangedAt: now,
      failedCount: 0,
      lockedUntil: null,
    });
    await this.d.tvCache.del(account.id);
    await this.audit(account.id, 'PASSWORD_CHANGE', ctx);
    await this.sendMail(
      updated.email,
      passwordChangedMail({ fullName: updated.fullName, at: formatDateTime(now) }),
    );
    return {
      token: await this.issue(updated, false),
      remember: false,
      mustChangePassword: false,
      fullName: updated.fullName,
    };
  }

  // ---------- Quên mật khẩu: cấp lại mật khẩu mới (C01 mục 6) ----------
  /** Luôn kết thúc giống nhau dù khớp hay không – không lộ CCCD nào đã đăng ký. */
  async forgotPassword(input: ForgotPasswordInput, ctx: RequestCtx): Promise<void> {
    await this.limit(`forgot:ip:${ctx.ipHash ?? 'x'}`, 10, 3600);
    if (!(await this.d.captcha.verify(input.captchaToken, ctx.ip))) throw new AppError('CAPTCHA_FAILED');
    const cccdHmac = this.d.pii.hmac(input.cccd);
    const perCccd = await this.d.limiter.hit(`forgot:cccd:${cccdHmac}`, 3, 3600);
    if (!perCccd.allowed) return;

    const account = await this.d.accounts.findByCccdHmac(cccdHmac);
    if (!account || account.status !== 'ACTIVE') return;
    if (account.birthYear !== input.birthYear || account.email !== input.email) {
      await this.audit(account.id, 'FORGOT_MISMATCH', ctx);
      return;
    }

    const password = generateTempPassword(this.d.randomInt);
    const updated = await this.d.accounts.bumpTokenVersion(account.id, {
      passwordHash: await this.d.hasher.hash(password),
      mustChangePassword: true,
      passwordChangedAt: this.d.now(),
      failedCount: 0,
      lockedUntil: null,
    });
    await this.d.tvCache.del(account.id);
    await this.audit(account.id, 'PASSWORD_RESET', ctx);
    await this.sendMail(
      updated.email,
      passwordResetMail({ fullName: updated.fullName, password, loginUrl: `${this.d.appUrl}/dang-nhap` }),
    );
  }

  // ---------- Phiên (C01 mục 8) ----------
  /** Kiểm JWT + token_version + trạng thái. null = phiên không còn hiệu lực. */
  async resolveSession(token: string | undefined): Promise<SessionAccount | null> {
    if (!token) return null;
    const claims = await this.d.tokens.verify(token);
    if (!claims) return null;
    const cachedTv = await this.d.tvCache.get(claims.sub);
    if (cachedTv !== null && cachedTv !== claims.tv) return null;
    const account = await this.d.accounts.findById(claims.sub);
    if (!account || account.status !== 'ACTIVE' || account.tokenVersion !== claims.tv) return null;
    if (cachedTv === null) await this.d.tvCache.set(account.id, account.tokenVersion);
    return {
      id: account.id,
      fullName: account.fullName,
      mustChangePassword: account.mustChangePassword,
      tokenVersion: account.tokenVersion,
    };
  }

  async logoutAll(accountId: string, ctx: RequestCtx): Promise<void> {
    await this.d.accounts.bumpTokenVersion(accountId);
    await this.d.tvCache.del(accountId);
    await this.audit(accountId, 'LOGOUT_ALL', ctx);
  }

  // ---------- Thông tin cá nhân (C01 mục 7) ----------
  async getProfile(accountId: string): Promise<Profile> {
    return this.toProfile(await this.requireAccount(accountId));
  }

  async updateProfile(accountId: string, input: UpdateProfileInput, ctx: RequestCtx): Promise<Profile> {
    const account = await this.requireAccount(accountId);
    const patch: Partial<AccountRecord> = {};
    const changed: string[] = [];

    if (input.email && input.email !== account.email) {
      // Đổi Gmail phải nhập lại mật khẩu (thay cho link xác nhận)
      if (
        !input.currentPassword ||
        !(await this.d.hasher.verify(account.passwordHash, input.currentPassword))
      ) {
        throw new AppError('AUTH_WRONG_PASSWORD');
      }
      patch.email = input.email;
      changed.push('email');
    }
    if (input.phone && input.phone !== account.phone) {
      patch.phone = input.phone;
      patch.phoneHmac = this.d.pii.hmac(input.phone);
      changed.push('phone');
    }
    if (input.addressLine !== undefined && (input.addressLine || null) !== account.addressLine) {
      patch.addressLine = input.addressLine || null;
      changed.push('addressLine');
    }
    if (input.insuranceNo !== undefined) {
      patch.insuranceNoEnc = input.insuranceNo ? this.d.pii.encrypt(input.insuranceNo.toUpperCase()) : null;
      changed.push('insuranceNo');
    }
    if (!changed.length) return this.toProfile(account);

    const updated = await this.d.accounts.update(account.id, patch);
    await this.audit(account.id, 'PROFILE_UPDATE', ctx, { fields: changed }); // chỉ ghi tên trường, không ghi giá trị
    if (patch.email) {
      await this.sendMail(
        account.email,
        emailChangedMail({ fullName: account.fullName, newEmailMasked: maskEmail(patch.email) }),
      );
    }
    return this.toProfile(updated);
  }

  // ---------- nội bộ ----------
  private async findForLogin(username: string): Promise<AccountRecord | null> {
    if (/^\d{12}$/.test(username)) return this.d.accounts.findByCccdHmac(this.d.pii.hmac(username));
    const list = (await this.d.accounts.findByPhoneHmac(this.d.pii.hmac(username))).filter(
      (a) => a.status !== 'DELETED',
    );
    if (list.length > 1) throw new AppError('AUTH_PHONE_AMBIGUOUS');
    return list[0] ?? null;
  }

  private async requireAccount(id: string): Promise<AccountRecord> {
    const a = await this.d.accounts.findById(id);
    if (!a || a.status === 'DELETED') throw new AppError('UNAUTHENTICATED');
    return a;
  }

  private issue(a: AccountRecord, remember: boolean): Promise<string> {
    const claims: SessionClaims = {
      sub: a.id,
      tv: a.tokenVersion,
      ...(a.mustChangePassword ? { mc: true } : {}),
    };
    return this.d.tokens.issue(claims, remember);
  }

  private async limit(key: string, limit: number, windowSec: number): Promise<number> {
    const r = await this.d.limiter.hit(key, limit, windowSec);
    if (!r.allowed) throw new AppError('RATE_LIMITED');
    return r.count;
  }

  private async sendMail(to: string, mail: MailContent): Promise<boolean> {
    const toHash = this.d.pii.hmac(to);
    try {
      await this.d.mailer.send({ to, subject: mail.subject, html: mail.html });
      await this.d.emailLog.log(mail.template, toHash, 'SENT');
      return true;
    } catch (e) {
      await this.d.emailLog.log(mail.template, toHash, 'FAILED', (e as Error).message.slice(0, 200));
      return false;
    }
  }

  private audit(accountId: string, action: string, ctx: RequestCtx, diff?: Record<string, unknown>) {
    return this.d.audit.write({
      actorType: 'PATIENT',
      actorId: accountId,
      action,
      module: 'AUTH',
      ipHash: ctx.ipHash,
      diff,
    });
  }

  private toProfile(a: AccountRecord): Profile {
    const ins = a.insuranceNoEnc ? this.d.pii.decrypt(a.insuranceNoEnc) : '';
    return {
      fullName: a.fullName,
      birthYear: a.birthYear,
      gender: a.gender,
      cccdMasked: maskCccd(this.d.pii.decrypt(a.cccdEnc)),
      phone: a.phone,
      email: a.email,
      addressLine: a.addressLine ?? '',
      insuranceNoMasked: ins ? `${ins.slice(0, 2)}********${ins.slice(-5)}` : '',
      createdAt: a.createdAt.toISOString(),
      lastLoginAt: a.lastLoginAt?.toISOString() ?? null,
    };
  }
}

// Hash argon2id của một chuỗi ngẫu nhiên – chỉ để so khi tài khoản không tồn tại (chống dò theo thời gian phản hồi)
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$LhWBfmTScQ2BOJwwSLbxEQ$l2ymTSLWN6ePrqzj6zslZQdrkLHOJCN45O5YY3p8MD8';
