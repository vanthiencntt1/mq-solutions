import nodemailer, { type Transporter } from 'nodemailer';
import type { Mailer, MailMessage } from '@/lib/domain/ports';
import { getEnv } from '@/lib/config/env';
import { logger } from '@/lib/infra/logger';

// Gửi email qua Gmail SMTP (A08). Gmail: cổng 587 + STARTTLS, mật khẩu ứng dụng; giới hạn ~500 thư/ngày
// với tài khoản Gmail thường, ~2.000 với Google Workspace.
let transporter: Transporter | undefined;

function getTransporter(): Transporter {
  if (!transporter) {
    const env = getEnv();
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true chỉ khi cổng 465
      auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    });
  }
  return transporter;
}

export const smtpMailer: Mailer = {
  async send(msg: MailMessage) {
    const info = await getTransporter().sendMail({ from: getEnv().SMTP_FROM, ...msg });
    // Không log địa chỉ nhận / nội dung (có thể chứa mật khẩu được cấp)
    logger.info({ messageId: info.messageId }, 'mail.sent');
  },
};
