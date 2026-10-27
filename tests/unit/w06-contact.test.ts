import { describe, expect, it } from 'vitest';
import { ContactInputSchema, type ContactInput } from '@/lib/domain/content/contact';
import { ContactService } from '@/lib/services/contact/contact-service';

const input: ContactInput = {
  type: 'CO_SO',
  org: '<Bệnh viện>',
  name: 'Người liên hệ',
  phone: '0900000000',
  email: 'test@example.com',
  message: 'Muốn hợp tác lâu dài',
  captchaToken: 'valid',
};

function setup({ captchaOk = true, mailFails = false } = {}) {
  const saved: unknown[] = [];
  const sent: string[] = [];
  let hits = 0;
  const service = new ContactService({
    repo: {
      create: async (lead) => {
        saved.push(lead);
      },
    },
    captcha: { verify: async () => captchaOk },
    limiter: { hit: async () => ({ allowed: ++hits <= 5, count: hits }) },
    mailer: {
      send: async (message) => {
        if (mailFails) throw new Error('SMTP');
        sent.push(message.html);
      },
    },
    salesEmail: 'sales@example.com',
    onMailFailure: () => undefined,
  });
  return { service, saved, sent };
}

describe('ContactService – W07', () => {
  it('từ chối SĐT và email sai định dạng', () => {
    expect(ContactInputSchema.safeParse({ ...input, phone: '123' }).success).toBe(false);
    expect(ContactInputSchema.safeParse({ ...input, email: 'sai-email' }).success).toBe(false);
  });
  it('lưu lead, gửi email đã escape HTML và không lưu captcha token', async () => {
    const { service, saved, sent } = setup();
    await service.submit(input, { ip: '127.0.0.1', ipHash: 'hash' });
    expect(saved).toHaveLength(1);
    expect(JSON.stringify(saved)).not.toContain('valid');
    expect(sent[0]).toContain('&lt;Bệnh viện&gt;');
  });
  it('CAPTCHA sai hoặc quá 5 lần/giờ thì không tạo lead', async () => {
    const bad = setup({ captchaOk: false });
    await expect(bad.service.submit(input, { ip: '127.0.0.1', ipHash: 'hash' })).rejects.toMatchObject({
      code: 'CAPTCHA_FAILED',
    });
    expect(bad.saved).toHaveLength(0);
    const limited = setup();
    for (let n = 0; n < 5; n++) await limited.service.submit(input, { ip: '127.0.0.1', ipHash: 'hash' });
    await expect(limited.service.submit(input, { ip: '127.0.0.1', ipHash: 'hash' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
    expect(limited.saved).toHaveLength(5);
  });
  it('SMTP lỗi sau khi lưu không khiến khách gửi trùng', async () => {
    const { service, saved } = setup({ mailFails: true });
    await expect(service.submit(input, { ip: '127.0.0.1', ipHash: 'hash' })).resolves.toBeUndefined();
    expect(saved).toHaveLength(1);
  });
});
