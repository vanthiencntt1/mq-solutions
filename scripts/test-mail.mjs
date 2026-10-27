#!/usr/bin/env node
// Gửi 1 email thử để kiểm cấu hình SMTP trong .env:  pnpm mail:test nguoi-nhan@gmail.com
import nodemailer from 'nodemailer';
import { loadEnv } from './_env.mjs';

const to = process.argv[2];
if (!to) {
  console.error('Cách dùng: pnpm mail:test <email-nhận>');
  process.exit(1);
}
const env = loadEnv();
const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: Number(env.SMTP_PORT),
  secure: env.SMTP_SECURE === 'true',
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
});
try {
  await transport.verify();
  const info = await transport.sendMail({
    from: env.SMTP_FROM,
    to,
    subject: 'MQ Solutions – thử cấu hình email',
    html: '<p>Email thử từ hệ thống MQ Solutions. Nếu bạn nhận được thư này, cấu hình SMTP đã đúng.</p>',
  });
  console.log(`Đã gửi (${info.messageId}) qua ${env.SMTP_HOST}:${env.SMTP_PORT}`);
} catch (e) {
  console.error(`Gửi thất bại: ${e.message}`);
  process.exit(1);
}
