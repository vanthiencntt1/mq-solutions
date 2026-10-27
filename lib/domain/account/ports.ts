import type { Mailer } from '../ports';

// Interface hạ tầng cho nghiệp vụ tài khoản – hiện thực ở lib/infra, test bằng bản giả.

export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'DISPUTED' | 'DELETED';

export interface AccountRecord {
  id: string;
  cccdEnc: string;
  cccdHmac: string;
  fullName: string;
  fullNameNorm: string;
  birthYear: number;
  birthDate: Date | null;
  gender: number;
  phone: string;
  phoneHmac: string;
  email: string;
  addressLine: string | null;
  insuranceNoEnc: string | null;
  passwordHash: string;
  mustChangePassword: boolean;
  passwordChangedAt: Date | null;
  tokenVersion: number;
  failedCount: number;
  lockedUntil: Date | null;
  status: AccountStatus;
  consentVersion: string;
  consentAt: Date;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export type NewAccount = Omit<
  AccountRecord,
  | 'id'
  | 'createdAt'
  | 'passwordChangedAt'
  | 'tokenVersion'
  | 'failedCount'
  | 'lockedUntil'
  | 'lastLoginAt'
  | 'status'
>;

export interface AccountRepository {
  findById(id: string): Promise<AccountRecord | null>;
  findByCccdHmac(hmac: string): Promise<AccountRecord | null>;
  findByPhoneHmac(hmac: string): Promise<AccountRecord[]>;
  create(data: NewAccount): Promise<AccountRecord>;
  update(id: string, patch: Partial<AccountRecord>): Promise<AccountRecord>;
  /** tăng token_version (đăng xuất mọi thiết bị), trả giá trị mới */
  bumpTokenVersion(id: string, patch?: Partial<AccountRecord>): Promise<AccountRecord>;
  hardDelete(id: string): Promise<void>;
}

export interface PiiCipher {
  encrypt(plain: string): string;
  decrypt(payload: string): string;
  hmac(value: string): string;
}

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface RateLimiter {
  /** Đếm 1 lần trong cửa sổ `windowSec`; allowed = chưa vượt `limit`. */
  hit(key: string, limit: number, windowSec: number): Promise<{ allowed: boolean; count: number }>;
}

export interface CaptchaVerifier {
  verify(token: string | undefined, ip: string | undefined): Promise<boolean>;
}

export interface SessionClaims {
  sub: string;
  tv: number;
  mc?: boolean; // must change password
}

export interface TokenIssuer {
  issue(claims: SessionClaims, remember: boolean): Promise<string>;
  verify(token: string): Promise<SessionClaims | null>;
}

export interface AuditEvent {
  actorType: 'PATIENT' | 'ADMIN' | 'SYSTEM';
  actorId: string;
  action: string;
  module: string;
  target?: string;
  diff?: Record<string, unknown>;
  ipHash?: string;
}

export interface AuditWriter {
  write(e: AuditEvent): Promise<void>;
}

export interface EmailLogWriter {
  log(template: string, toHash: string, status: 'SENT' | 'FAILED', error?: string): Promise<void>;
}

/** Cache số token_version để không đọc DB mỗi request (C01 mục 8: cache 60 giây). */
export interface TokenVersionCache {
  get(accountId: string): Promise<number | null>;
  set(accountId: string, tv: number): Promise<void>;
  del(accountId: string): Promise<void>;
}

export interface AuthDeps {
  accounts: AccountRepository;
  pii: PiiCipher;
  hasher: PasswordHasher;
  limiter: RateLimiter;
  captcha: CaptchaVerifier;
  tokens: TokenIssuer;
  tvCache: TokenVersionCache;
  mailer: Mailer;
  emailLog: EmailLogWriter;
  audit: AuditWriter;
  randomInt: (max: number) => number;
  now: () => Date;
  appUrl: string;
  consentVersion: string;
}
