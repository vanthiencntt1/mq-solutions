// Đọc .env đơn giản (không phụ thuộc thư viện) – dùng chung cho backup / restore.
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

export function loadEnv(file = '.env') {
  const env = { ...process.env };
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m || line.trimStart().startsWith('#')) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
        v = v.slice(1, -1);
      if (env[m[1]] === undefined) env[m[1]] = v;
    }
  }
  return env;
}

/** postgresql://user:pass@host:port/db?schema=public → { user, password, host, port, db } */
export function parseDbUrl(url) {
  if (!url) throw new Error('Thiếu DATABASE_URL trong .env');
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
    db: u.pathname.replace(/^\//, ''),
  };
}

/** Dấu vân tay khóa (không lộ khóa) – để kiểm tra server mới dùng đúng bộ khóa. */
export const fingerprint = (secret) =>
  secret ? createHash('sha256').update(secret).digest('hex').slice(0, 12) : null;

export function getArg(name, fallback) {
  const i = process.argv.indexOf(name);
  return i > -1 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--')
    ? process.argv[i + 1]
    : fallback;
}
export const hasFlag = (name) => process.argv.includes(name);

export function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  if (r.error) throw r.error;
  if (r.status !== 0) throw new Error(`Lệnh lỗi (${r.status}): ${cmd} ${args.join(' ')}`);
  return r;
}
