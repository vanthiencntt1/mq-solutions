import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import type { EmailTemplateRow, TemplateCode } from './types';

// A08 mục 1: chỉ các biến trong danh sách này được đưa vào mẫu, kể cả khi admin sửa nội dung.
export const TEMPLATE_SPECS: Record<
  TemplateCode,
  { label: string; variables: readonly string[]; subject: string; text: string }
> = {
  ACCOUNT_CREATED: {
    label: 'Tạo tài khoản',
    variables: ['hoTen', 'cccdChe', 'matKhauTam', 'linkDangNhap'],
    subject: 'Tài khoản MQ Solutions đã sẵn sàng',
    text: 'Xin chào {{hoTen}},\nTài khoản của bạn (CCCD {{cccdChe}}) đã được tạo. Mật khẩu tạm: {{matKhauTam}}\nĐăng nhập: {{linkDangNhap}}\nVui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.',
  },
  PASSWORD_RESET: {
    label: 'Quên mật khẩu',
    variables: ['matKhauMoi'],
    subject: 'Mật khẩu MQ Solutions mới',
    text: 'Mật khẩu mới của bạn: {{matKhauMoi}}\nVui lòng đổi mật khẩu sau khi đăng nhập.',
  },
  PASSWORD_ISSUED: {
    label: 'Admin cấp mật khẩu',
    variables: ['matKhauTam'],
    subject: 'Mật khẩu tạm MQ Solutions',
    text: 'Mật khẩu tạm của bạn: {{matKhauTam}}\nVui lòng đổi mật khẩu sau khi đăng nhập.',
  },
  PASSWORD_CHANGED: {
    label: 'Đổi mật khẩu',
    variables: ['thoiDiem', 'ipRutGon'],
    subject: 'Mật khẩu MQ Solutions đã thay đổi',
    text: 'Mật khẩu của bạn đã thay đổi lúc {{thoiDiem}} từ IP {{ipRutGon}}. Nếu không phải bạn, hãy liên hệ hỗ trợ.',
  },
  BOOKING_SUCCESS: {
    label: 'Đặt khám thành công',
    variables: ['phieuKham', 'stt', 'qr', 'huongDan', 'quyDinhHuy'],
    subject: 'Phiếu khám {{phieuKham}} đã có số thứ tự',
    text: 'Phiếu khám: {{phieuKham}}\nSố thứ tự: {{stt}}\nMã QR: {{qr}}\nHướng dẫn: {{huongDan}}\nQuy định hủy: {{quyDinhHuy}}',
  },
  BOOKING_REMIND: {
    label: 'Nhắc lịch khám',
    variables: ['ngayGio', 'phong', 'stt'],
    subject: 'Nhắc lịch khám {{ngayGio}}',
    text: 'Bạn có lịch khám lúc {{ngayGio}}, phòng {{phong}}, số thứ tự {{stt}}.',
  },
  BOOKING_CANCELLED: {
    label: 'Hủy phiếu khám',
    variables: ['lyDo', 'hoanTien'],
    subject: 'Phiếu khám đã hủy',
    text: 'Phiếu khám của bạn đã hủy. Lý do: {{lyDo}}\nThông tin hoàn tiền: {{hoanTien}}',
  },
  REFUND_DONE: {
    label: 'Hoàn tiền',
    variables: ['soTien', 'maGiaoDich'],
    subject: 'Đã hoàn tiền phiếu khám',
    text: 'Đã hoàn {{soTien}}. Mã giao dịch: {{maGiaoDich}}.',
  },
  EMAIL_CHANGED: {
    label: 'Đổi Gmail',
    variables: ['huongDanLienHe'],
    subject: 'Gmail tài khoản MQ Solutions đã thay đổi',
    text: 'Gmail liên kết với tài khoản của bạn đã thay đổi. Nếu không phải bạn, {{huongDanLienHe}}.',
  },
};

export const TEMPLATE_CODES = Object.keys(TEMPLATE_SPECS) as TemplateCode[];
export const TemplateCodeSchema = z.enum(TEMPLATE_CODES as [TemplateCode, ...TemplateCode[]]);
export const TemplateBodySchema = z.object({ text: z.string().min(1).max(10000) }).strict();
export const TemplateEditSchema = z.object({
  subject: z.string().trim().min(1).max(200),
  bodyJson: TemplateBodySchema,
});
export const EmailJobSchema = z.object({
  code: TemplateCodeSchema,
  to: z.email(),
  vars: z.record(z.string(), z.string().max(2000)),
  attachments: z
    .array(z.object({ filename: z.string().min(1).max(120), base64: z.string().max(8_000_000) }))
    .max(2)
    .optional(),
});

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );
const placeholders = (value: string) =>
  [...value.matchAll(/{{\s*([^{}]+?)\s*}}/g)].map((match) => match[1] ?? '');

export function validateTemplate(code: TemplateCode, subject: string, text: string): void {
  const allowed = new Set(TEMPLATE_SPECS[code].variables);
  if ([...placeholders(subject), ...placeholders(text)].some((name) => !allowed.has(name)))
    throw new AppError('NOTIFICATION_TEMPLATE_VARIABLE');
  if (
    /{{|}}/.test(subject.replace(/{{\s*[^{}]+?\s*}}/g, '')) ||
    /{{|}}/.test(text.replace(/{{\s*[^{}]+?\s*}}/g, ''))
  )
    throw new AppError('NOTIFICATION_TEMPLATE_VARIABLE');
}

export function defaultTemplate(code: TemplateCode): EmailTemplateRow {
  const spec = TEMPLATE_SPECS[code];
  return { code, subject: spec.subject, bodyJson: { text: spec.text } };
}

export function renderTemplate(row: EmailTemplateRow, vars: Record<string, string>) {
  const spec = TEMPLATE_SPECS[row.code];
  validateTemplate(row.code, row.subject, row.bodyJson.text);
  if (Object.keys(vars).some((name) => !spec.variables.includes(name)))
    throw new AppError('NOTIFICATION_TEMPLATE_VARIABLE');
  const replace = (value: string) =>
    value.replace(/{{\s*([^{}]+?)\s*}}/g, (_full, name: string) => {
      if (vars[name] === undefined) throw new AppError('NOTIFICATION_TEMPLATE_VARIABLE');
      return vars[name];
    });
  const subject = replace(row.subject).replace(/[\r\n]/g, ' ');
  const text = replace(row.bodyJson.text);
  const html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#0b3558">${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  return { subject, html, text };
}

export function sampleVariables(code: TemplateCode): Record<string, string> {
  return Object.fromEntries(
    TEMPLATE_SPECS[code].variables.map((name) => [
      name,
      name.toLowerCase().includes('matkhau') ? 'MẬT KHẨU MẪU' : `[${name}]`,
    ]),
  );
}
