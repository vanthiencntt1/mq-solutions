import type { CaptchaVerifier } from '@/lib/domain/account/ports';
import { logger } from '@/lib/infra/logger';

// Cloudflare Turnstile. Không cấu hình TURNSTILE_SECRET_KEY (máy dev) → bỏ qua kiểm tra.
export function turnstileVerifier(secret: string | undefined): CaptchaVerifier {
  return {
    async verify(token, ip) {
      if (!secret) return true;
      if (!token) return false;
      try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
          signal: AbortSignal.timeout(5000),
        });
        const json = (await res.json()) as { success?: boolean };
        return json.success === true;
      } catch (err) {
        logger.warn({ err: (err as Error).name }, 'captcha.unreachable');
        return false;
      }
    },
  };
}
