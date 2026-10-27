import type { CaptchaVerifier, RateLimiter } from '@/lib/domain/account/ports';
import type { ContactInput, ContactLeadWriter } from '@/lib/domain/content/contact';
import { AppError } from '@/lib/domain/errors';
import type { Mailer } from '@/lib/domain/ports';

interface ContactDeps {
  repo: ContactLeadWriter;
  captcha: CaptchaVerifier;
  limiter: RateLimiter;
  mailer: Mailer;
  salesEmail: string;
  onMailFailure(errorName: string): void;
}

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );

export class ContactService {
  constructor(private readonly d: ContactDeps) {}

  async submit(input: ContactInput, context: { ip: string; ipHash: string }): Promise<void> {
    const limit = await this.d.limiter.hit(`contact:${context.ipHash}`, 5, 60 * 60);
    if (!limit.allowed) throw new AppError('RATE_LIMITED');
    if (!(await this.d.captcha.verify(input.captchaToken, context.ip))) throw new AppError('CAPTCHA_FAILED');
    const { captchaToken: _captchaToken, ...lead } = input;
    await this.d.repo.create(lead);
    try {
      await this.d.mailer.send({
        to: this.d.salesEmail,
        subject: 'MQ Solutions – liên hệ hợp tác mới',
        html: `<p>Có liên hệ hợp tác mới:</p><ul><li>Loại: ${escapeHtml(lead.type)}</li><li>Đơn vị: ${escapeHtml(lead.org)}</li><li>Người liên hệ: ${escapeHtml(lead.name)}</li><li>SĐT: ${escapeHtml(lead.phone)}</li><li>Email: ${escapeHtml(lead.email)}</li></ul><p>${escapeHtml(lead.message).replace(/\n/g, '<br>')}</p>`,
      });
    } catch (error) {
      // W07/A09: bản ghi đã lưu để nhân viên xử lý; lỗi SMTP không khiến khách gửi lặp.
      this.d.onMailFailure(error instanceof Error ? error.name : 'unknown');
    }
  }
}
