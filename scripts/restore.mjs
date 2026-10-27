#!/usr/bin/env node
// Khôi phục 1 bản sao lưu vào máy / server hiện tại (GHI ĐÈ dữ liệu đang có).
//
//   pnpm db:restore backups/20261026-0915 --yes
//   pnpm db:restore backups/20261026-0915 --yes --compose docker/docker-compose.yml
//   pnpm db:restore backups/20261026-0915 --yes --direct
//
// Trước khi chạy: .env của máy mới phải có ĐÚNG PII_SECRET, PII_HMAC_SECRET như máy cũ (script tự kiểm).
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fingerprint, getArg, hasFlag, loadEnv, parseDbUrl, run } from './_env.mjs';

const dir = process.argv[2];
if (!dir || dir.startsWith('--') || !existsSync(path.join(dir, 'db.dump'))) {
  console.error('Cách dùng: pnpm db:restore <thư-mục-backup> --yes [--compose file | --direct]');
  process.exit(1);
}
const env = loadEnv();
const db = parseDbUrl(env.DATABASE_URL);
const manifest = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));

// Kiểm khóa: khác khóa → CCCD / số BHYT đã mã hóa không đọc được, đăng nhập bằng CCCD không khớp
for (const k of ['PII_SECRET', 'PII_HMAC_SECRET']) {
  if (manifest.keys?.[k] && manifest.keys[k] !== fingerprint(env[k])) {
    console.error(`[restore] ${k} trong .env KHÁC máy đã sao lưu. Chép đúng khóa cũ vào .env rồi chạy lại.`);
    if (!hasFlag('--ignore-keys')) process.exit(1);
  }
}
if (!hasFlag('--yes')) {
  console.error(`[restore] Lệnh này GHI ĐÈ database "${db.db}" và thư mục tệp. Thêm --yes để xác nhận.`);
  process.exit(1);
}

const compose = getArg('--compose', 'docker/docker-compose.dev.yml');
const restoreArgs = [
  '-U',
  db.user,
  '-d',
  db.db,
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-privileges',
  '--single-transaction',
];
const [cmd, args, extraEnv] = hasFlag('--direct')
  ? ['pg_restore', ['-h', db.host, '-p', db.port, ...restoreArgs], { PGPASSWORD: db.password }]
  : ['docker', ['compose', '-f', compose, 'exec', '-T', 'postgres', 'pg_restore', ...restoreArgs], {}];

console.log(`[restore] database ← ${dir}/db.dump`);
{
  const p = spawn(cmd, args, { env: { ...process.env, ...extraEnv }, stdio: ['pipe', 'inherit', 'inherit'] });
  const exited = new Promise((resolve, reject) => {
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pg_restore lỗi (${code})`))));
  });
  await Promise.all([pipeline(createReadStream(path.join(dir, 'db.dump')), p.stdin), exited]);
}

const storageDir = env.STORAGE_DIR ?? './storage';
if (existsSync(path.join(dir, 'storage.tar.gz'))) {
  console.log(`[restore] tệp ← storage.tar.gz → ${storageDir}`);
  mkdirSync(storageDir, { recursive: true });
  run('tar', ['-xzf', path.join(dir, 'storage.tar.gz'), '-C', storageDir]);
}
console.log('[restore] xong. Khởi động lại web + worker.');
