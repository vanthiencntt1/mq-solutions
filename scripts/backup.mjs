#!/usr/bin/env node
// Sao lưu toàn bộ dữ liệu web: database (pg_dump) + thư mục ảnh / tệp (STORAGE_DIR).
// Redis không cần sao lưu: chỉ chứa cache, giữ chỗ 15 phút, hàng đợi (tự sinh lại).
//
//   pnpm db:backup                       # Postgres chạy trong Docker (docker/docker-compose.dev.yml)
//   pnpm db:backup --compose docker/docker-compose.yml   # server production
//   pnpm db:backup --direct              # dùng pg_dump cài sẵn trên máy, nối thẳng DATABASE_URL
//   tùy chọn: --out backups  --keep 30 (giữ 30 bản gần nhất)  --with-env (chép kèm .env – có khóa bí mật!)
import {
  copyFileSync,
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fingerprint, getArg, hasFlag, loadEnv, parseDbUrl, run } from './_env.mjs';

const env = loadEnv();
const db = parseDbUrl(env.DATABASE_URL);
const outRoot = getArg('--out', 'backups');
const keep = Number(getArg('--keep', '30'));
const compose = getArg('--compose', 'docker/docker-compose.dev.yml');
const direct = hasFlag('--direct');
const storageDir = env.STORAGE_DIR ?? './storage';

const stamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13); // 20261026-0915
const dir = path.join(outRoot, stamp);
mkdirSync(dir, { recursive: true });

// 1. Database: định dạng custom (-Fc) – nén sẵn, khôi phục chọn lọc được
const dumpArgs = ['-U', db.user, '-d', db.db, '-Fc', '--no-owner', '--no-privileges'];
const [cmd, args, extraEnv] = direct
  ? ['pg_dump', ['-h', db.host, '-p', db.port, ...dumpArgs], { PGPASSWORD: db.password }]
  : ['docker', ['compose', '-f', compose, 'exec', '-T', 'postgres', 'pg_dump', ...dumpArgs], {}];

console.log(`[backup] database ${db.db} → ${dir}/db.dump`);
{
  const p = spawn(cmd, args, { env: { ...process.env, ...extraEnv }, stdio: ['ignore', 'pipe', 'inherit'] });
  const exited = new Promise((resolve, reject) => {
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pg_dump lỗi (${code})`))));
  });
  await Promise.all([pipeline(p.stdout, createWriteStream(path.join(dir, 'db.dump'))), exited]);
}

// 2. Ảnh / tệp
if (existsSync(storageDir)) {
  console.log(`[backup] tệp ${storageDir} → ${dir}/storage.tar.gz`);
  run('tar', ['-czf', path.join(dir, 'storage.tar.gz'), '-C', storageDir, '.']);
} else {
  console.log(`[backup] chưa có thư mục ${storageDir}, bỏ qua`);
}

// 3. .env (tùy chọn) – BẮT BUỘC giữ PII_SECRET / PII_HMAC_SECRET để server mới đọc được CCCD
if (hasFlag('--with-env') && existsSync('.env')) copyFileSync('.env', path.join(dir, 'env.backup'));

writeFileSync(
  path.join(dir, 'manifest.json'),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      database: db.db,
      dbBytes: statSync(path.join(dir, 'db.dump')).size,
      storage: existsSync(path.join(dir, 'storage.tar.gz')),
      withEnv: hasFlag('--with-env'),
      // chỉ dấu vân tay, không phải khóa
      keys: { PII_SECRET: fingerprint(env.PII_SECRET), PII_HMAC_SECRET: fingerprint(env.PII_HMAC_SECRET) },
    },
    null,
    2,
  ),
);

// 4. Xóa bản cũ, giữ `keep` bản gần nhất
const all = readdirSync(outRoot)
  .filter((d) => /^\d{8}-\d{4}$/.test(d))
  .sort();
for (const old of all.slice(0, Math.max(0, all.length - keep)))
  rmSync(path.join(outRoot, old), { recursive: true, force: true });

console.log(`[backup] xong: ${dir}`);
if (!hasFlag('--with-env'))
  console.log(
    '[backup] Nhớ cất riêng .env (PII_SECRET, PII_HMAC_SECRET) – mất khóa là không đọc được CCCD đã lưu.',
  );
