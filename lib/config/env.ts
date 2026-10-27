import { z } from 'zod';

// Đọc env bằng Zod, thiếu là dừng (00-CONG-NGHE-QUY-UOC mục 13). Đọc lười để `next build` không cần env thật.
const secret = z.string().min(32, 'phải ≥ 32 ký tự');

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: z.url(),
    LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    JWT_SECRET: secret,
    ADMIN_SESSION_SECRET: secret,
    PII_SECRET: secret,
    PII_HMAC_SECRET: secret,
    SMTP_HOST: z.string().min(1),
    SMTP_PORT: z.coerce.number().int().positive(),
    SMTP_SECURE: z
      .enum(['true', 'false'])
      .default('false')
      .transform((v) => v === 'true'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),
    SMTP_FROM: z.string().min(1),
    STORAGE_DIR: z.string().min(1).default('./storage'),
    // Để trống ở máy dev = tắt CAPTCHA. Production bắt buộc (kiểm bên dưới).
    TURNSTILE_SITE_KEY: z.string().optional(),
    TURNSTILE_SECRET_KEY: z.string().optional(),
    // W06W07: hộp thư nhận liên hệ hợp tác; bỏ trống dùng SMTP_FROM.
    CONTACT_SALES_EMAIL: z.union([z.email(), z.literal('')]).optional().transform((value) => value || undefined),
    // W06W07: kênh hỗ trợ chỉ hiện khi đã có URL chính thức.
    SUPPORT_ZALO_URL: z.union([z.url().startsWith('https://'), z.literal('')]).optional().transform((value) => value || undefined),
    SUPPORT_FACEBOOK_URL: z.union([z.url().startsWith('https://'), z.literal('')]).optional().transform((value) => value || undefined),
    // G3ANALYTICS: origin Umami do vận hành cố định để CSP không nhận URL tùy ý từ DB.
    UMAMI_ORIGIN: z
      .union([z.literal(''), z.url().startsWith('https://')])
      .optional()
      .transform((value) => value || undefined)
      .refine((value) => !value || new URL(value).origin === value),
  })
  .superRefine((v, ctx) => {
    if (v.NODE_ENV === 'production' && (!v.TURNSTILE_SITE_KEY || !v.TURNSTILE_SECRET_KEY)) {
      ctx.addIssue({
        code: 'custom',
        path: ['TURNSTILE_SECRET_KEY'],
        message: 'production phải bật CAPTCHA',
      });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Biến môi trường không hợp lệ:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Đọc bí mật theo tên biến (facility.secret_ref, facility.webhook_key_ref). Không lưu khóa trong DB. */
export function getSecretByRef(ref: string): string {
  if (!/^[A-Z][A-Z0-9_]*$/.test(ref)) throw new Error(`Tên biến bí mật không hợp lệ: ${ref}`);
  const value = process.env[ref];
  if (!value) throw new Error(`Chưa cấu hình biến bí mật ${ref}`);
  return value;
}
