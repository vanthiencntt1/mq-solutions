import { jwtVerify, SignJWT } from 'jose';
import type { SessionClaims, TokenIssuer } from '@/lib/domain/account/ports';

// Phiên bệnh nhân = JWT trong cookie HttpOnly, không lưu DB (C01 mục 8).
// Payload: sub = accountId, tv = token_version, mc = phải đổi mật khẩu.
export { ADMIN_COOKIE, PATIENT_COOKIE } from '@/lib/config/cookies';

const key = (secret: string) => new TextEncoder().encode(secret);

export async function verifyPatientToken(token: string, secret: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ['HS256'] });
    if (typeof payload.sub !== 'string' || typeof payload.tv !== 'number') return null;
    return { sub: payload.sub, tv: payload.tv, ...(payload.mc === true ? { mc: true } : {}) };
  } catch {
    return null;
  }
}

export function jwtTokenIssuer(secret: string): TokenIssuer {
  return {
    issue: (claims, remember) =>
      new SignJWT({ tv: claims.tv, ...(claims.mc ? { mc: true } : {}) })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(remember ? '7d' : '12h')
        .sign(key(secret)),
    verify: (token) => verifyPatientToken(token, secret),
  };
}
