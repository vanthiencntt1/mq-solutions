import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';

// Mã hóa dữ liệu cá nhân (CCCD, số BHYT) bằng AES-256-GCM + HMAC để tìm (00-DATABASE mục 8).
// Định dạng: base64(iv[12] | tag[16] | ciphertext)

const keyFrom = (secret: string) => createHash('sha256').update(secret).digest();

export function encryptPii(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function decryptPii(payload: string, secret: string): string {
  const buf = Buffer.from(payload, 'base64');
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString('utf8');
}

/** HMAC-SHA256 hex – dùng làm khóa tìm kiếm / UNIQUE (cccd_hmac, phone_hmac). */
export function hmacPii(value: string, secret: string): string {
  return createHmac('sha256', secret).update(value.trim()).digest('hex');
}
