import { payosSign } from '@/lib/infra/payment/payos';
import { payosOrderCodeOf } from '@/lib/domain/payment/types';

// Chạy local: tsx --env-file-if-exists=.env tests/mocks/payos-webhook.ts BVA MQ1234567890 200000
// Ký bằng <PREFIX>_CHECKSUM_KEY (mặc định PAYOS_<FACILITY>), tuyệt đối không in khóa ra terminal.
const [facility, orderCode, amountRaw, prefixArg] = process.argv.slice(2);
const amount = Number(amountRaw);
if (!facility || !orderCode || !Number.isSafeInteger(amount) || amount <= 0)
  throw new Error('Cú pháp: <facility> <orderCode> <amountVnd> [tiền tố biến, mặc định PAYOS_<FACILITY>]');

const prefix = prefixArg ?? `PAYOS_${facility.toUpperCase()}`;
const key = process.env[`${prefix}_CHECKSUM_KEY`];
if (!key) throw new Error(`Chưa cấu hình ${prefix}_CHECKSUM_KEY`);

const data = {
  orderCode: payosOrderCodeOf(orderCode),
  amount,
  description: orderCode,
  accountNumber: 'LOCAL',
  reference: `LOCAL${Date.now()}`,
  transactionDateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
  currency: 'VND',
  paymentLinkId: 'local',
  code: '00',
  desc: 'success',
};
const base = process.env.APP_URL ?? 'http://localhost:3000';
const response = await fetch(`${base}/api/payment/payos/${encodeURIComponent(facility)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ code: '00', desc: 'success', success: true, data, signature: payosSign(data, key) }),
});
console.log(`HTTP ${response.status}: ${await response.text()}`);
