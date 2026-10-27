import { createHash, randomUUID } from 'node:crypto';
import type { AccountRecord, AuthDeps, NewAccount, SessionClaims } from '@/lib/domain/account/ports';
import type { MailMessage } from '@/lib/domain/ports';

// Bản giả hạ tầng cho test AuthService – không cần Postgres / Redis / SMTP.
export function makeFakes(opts: { captchaOk?: boolean; mailFails?: boolean; now?: Date } = {}) {
  const accounts = new Map<string, AccountRecord>();
  const sent: MailMessage[] = [];
  const auditLog: string[] = [];
  const counters = new Map<string, number>();
  const tvCache = new Map<string, number>();
  let now = opts.now ?? new Date('2026-10-26T03:00:00Z');
  let seq = 0;

  const deps: AuthDeps = {
    accounts: {
      async findById(id) {
        return accounts.get(id) ?? null;
      },
      async findByCccdHmac(h) {
        return [...accounts.values()].find((a) => a.cccdHmac === h) ?? null;
      },
      async findByPhoneHmac(h) {
        return [...accounts.values()].filter((a) => a.phoneHmac === h);
      },
      async create(data: NewAccount) {
        const a: AccountRecord = {
          ...data,
          id: randomUUID(),
          createdAt: now,
          passwordChangedAt: null,
          tokenVersion: 0,
          failedCount: 0,
          lockedUntil: null,
          lastLoginAt: null,
          status: 'ACTIVE',
        };
        accounts.set(a.id, a);
        return a;
      },
      async update(id, patch) {
        const a = { ...accounts.get(id)!, ...patch };
        accounts.set(id, a);
        return a;
      },
      async bumpTokenVersion(id, patch) {
        const cur = accounts.get(id)!;
        const a = { ...cur, ...patch, tokenVersion: cur.tokenVersion + 1 };
        accounts.set(id, a);
        return a;
      },
      async hardDelete(id) {
        accounts.delete(id);
      },
    },
    pii: {
      encrypt: (s) => `enc:${s}`,
      decrypt: (s) => s.replace(/^enc:/, ''),
      hmac: (s) => createHash('sha256').update(`k|${s}`).digest('hex'),
    },
    hasher: {
      hash: async (p) => `h:${p}`,
      verify: async (h, p) => h === `h:${p}`,
    },
    limiter: {
      async hit(key, limit) {
        const c = (counters.get(key) ?? 0) + 1;
        counters.set(key, c);
        return { allowed: c <= limit, count: c };
      },
    },
    captcha: { verify: async () => opts.captchaOk ?? true },
    tokens: {
      issue: async (c: SessionClaims) => `tok.${JSON.stringify(c)}`,
      verify: async (t) => (t.startsWith('tok.') ? (JSON.parse(t.slice(4)) as SessionClaims) : null),
    },
    tvCache: {
      get: async (id) => tvCache.get(id) ?? null,
      set: async (id, tv) => void tvCache.set(id, tv),
      del: async (id) => void tvCache.delete(id),
    },
    mailer: {
      async send(m) {
        if (opts.mailFails) throw new Error('smtp down');
        sent.push(m);
      },
    },
    emailLog: { log: async () => undefined },
    audit: { write: async (e) => void auditLog.push(e.action) },
    randomInt: (max) => seq++ % max,
    now: () => now,
    appUrl: 'https://mq.test',
    consentVersion: '2026-10',
  };

  return {
    deps,
    accounts,
    sent,
    auditLog,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
    /** Lấy mật khẩu trong email gần nhất */
    lastPassword(): string {
      const html = sent.at(-1)?.html ?? '';
      return html.match(/Mật khẩu: <b[^>]*>([^<]+)<\/b>/)?.[1] ?? '';
    },
  };
}
