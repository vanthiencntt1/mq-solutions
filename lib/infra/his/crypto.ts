import { createCipheriv, createDecipheriv, createHash, createHmac } from 'node:crypto';

/**
 * Mã hóa gói tin ApiDatKham – bám đúng Helpers/Utility.cs (Encrypt/Decrypt) của ApiEcosystem:
 *   TripleDESCryptoServiceProvider, Key = MD5(UTF8(KEY)) (16 byte → 3DES 2 khóa), Mode = ECB, Padding = PKCS7.
 * Node cần khóa 24 byte: K1|K2|K1.
 */
function tripleDesKey(key: string): Buffer {
  const md5 = createHash('md5').update(key, 'utf8').digest();
  return Buffer.concat([md5, md5.subarray(0, 8)]);
}

export function encrypt3DES(plain: string, key: string): string {
  const cipher = createCipheriv('des-ede3-ecb', tripleDesKey(key), null);
  return Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]).toString('base64');
}

export function decrypt3DES(encoded: string, key: string): string {
  const decipher = createDecipheriv('des-ede3-ecb', tripleDesKey(key), null);
  return Buffer.concat([decipher.update(Buffer.from(encoded, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Chữ ký gửi kèm. Hiện ApiDatKham chưa kiểm (VerifyHashPKH luôn true – C02 mục 6);
 * web vẫn ký HMAC-SHA256(data + partnerCode) để sẵn sàng khi đội HIS bật kiểm tra.
 */
export function signHis(data: string, partnerCode: string, key: string): string {
  return createHmac('sha256', key).update(`${partnerCode}|${data}`).digest('hex');
}
