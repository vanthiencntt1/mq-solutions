import { hash, verify } from '@node-rs/argon2';
import type { PasswordHasher } from '@/lib/domain/account/ports';

// argon2id, tham số mặc định của @node-rs/argon2 (m=19 MiB, t=2, p=1 – khuyến nghị OWASP).
export const argon2Hasher: PasswordHasher = {
  hash: (plain) => hash(plain),
  verify: (h, plain) => verify(h, plain).catch(() => false),
};
