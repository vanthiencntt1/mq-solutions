import { randomInt } from 'node:crypto';

// Chạy local: tsx --env-file-if-exists=.env tests/mocks/sepay-webhook.ts BVA MQ1234567890 200000 0123456789
// Khóa lấy từ SEPAY_WEBHOOK_KEY_<FACILITY>, tuyệt đối không in ra terminal.
const [facility, orderCode, amountRaw, accountNumber] = process.argv.slice(2);
const amount = Number(amountRaw);
if (!facility || !orderCode || !accountNumber || !Number.isSafeInteger(amount) || amount <= 0)
  throw new Error('Cú pháp: <facility> <orderCode> <amountVnd> <bankAccountNo>');

const key = process.env[`SEPAY_WEBHOOK_KEY_${facility.toUpperCase()}`];
if (!key) throw new Error('Chưa cấu hình khóa webhook local cho cơ sở');

const base = process.env.APP_URL ?? 'http://localhost:3000';
const response = await fetch(`${base}/api/payment/sepay/${encodeURIComponent(facility)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Apikey ${key}` },
  body: JSON.stringify({
    id: `${Date.now()}${randomInt(1000, 9999)}`,
    accountNumber,
    content: orderCode,
    code: orderCode,
    transferType: 'in',
    transferAmount: amount,
    referenceCode: `LOCAL${Date.now()}`,
  }),
});
console.log(`HTTP ${response.status}: ${await response.text()}`);
