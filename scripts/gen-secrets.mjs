#!/usr/bin/env node
// Sinh khóa ngẫu nhiên (48 byte, base64url) cho JWT_SECRET, ADMIN_SESSION_SECRET, PII_SECRET, PII_HMAC_SECRET
// và ghi thẳng vào .env. Không in khóa ra màn hình.
// Dùng: node scripts/gen-secrets.mjs [đường-dẫn-.env] [--force]
// Cảnh báo: đổi PII_SECRET / PII_HMAC_SECRET khi đã có dữ liệu thật sẽ KHÔNG đọc lại được CCCD đã lưu.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--')) ?? '.env';
const force = args.includes('--force');
const KEYS = ['JWT_SECRET', 'ADMIN_SESSION_SECRET', 'PII_SECRET', 'PII_HMAC_SECRET'];

if (!existsSync(file)) {
  console.error(`Không thấy ${file}. Chạy: cp .env.example .env`);
  process.exit(1);
}

let text = readFileSync(file, 'utf8');
const changed = [];
for (const key of KEYS) {
  const re = new RegExp(`^${key}=(.*)$`, 'm');
  const current = text.match(re)?.[1]?.trim() ?? '';
  const isPlaceholder = current === '' || current.startsWith('change-me');
  if (!isPlaceholder && !force) continue;
  const value = randomBytes(48).toString('base64url');
  text = re.test(text) ? text.replace(re, `${key}=${value}`) : `${text.trimEnd()}\n${key}=${value}\n`;
  changed.push(key);
}
writeFileSync(file, text);
console.log(
  changed.length
    ? `Đã sinh khóa mới cho: ${changed.join(', ')} (${file})`
    : 'Các khóa đã có giá trị, giữ nguyên (dùng --force để sinh lại).',
);
