import type { PiiCipher } from '@/lib/domain/account/ports';
import { decryptPii, encryptPii, hmacPii } from './pii';

export function piiCipher(secret: string, hmacSecret: string): PiiCipher {
  return {
    encrypt: (s) => encryptPii(s, secret),
    decrypt: (s) => decryptPii(s, secret),
    hmac: (s) => hmacPii(s, hmacSecret),
  };
}
