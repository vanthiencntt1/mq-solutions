// Mẫu email tài khoản (A08). Bố cục bảng + màu token mục 10 để hiển thị ổn trên Gmail / Outlook.
// Giai đoạn sau đọc tiêu đề / nội dung từ bảng email_template, các mẫu dưới đây là mặc định.

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="vi"><body style="margin:0;background:#f8f9fb;font-family:Arial,Helvetica,sans-serif;color:#0b3558">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8f9fb;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d4e0ed;border-radius:16px">
<tr><td style="padding:24px 28px 8px"><span style="display:inline-block;background:#006bff;color:#fff;font-weight:700;border-radius:8px;padding:6px 8px">MQ</span>
<span style="font-weight:700;font-size:18px;margin-left:6px">MQ Solutions</span></td></tr>
<tr><td style="padding:8px 28px 4px"><h1 style="font-size:20px;margin:0 0 12px">${esc(title)}</h1></td></tr>
<tr><td style="padding:0 28px 24px;font-size:15px;line-height:1.6;color:#0b3558">${body}</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #d4e0ed;font-size:12px;color:#476788">
Email tự động từ MQ Solutions, vui lòng không trả lời. Nếu bạn không thực hiện thao tác này, hãy liên hệ hotline để được hỗ trợ.</td></tr>
</table></td></tr></table></body></html>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0"><a href="${esc(href)}" style="background:#006bff;color:#fff;text-decoration:none;font-weight:600;padding:12px 20px;border-radius:8px;display:inline-block">${esc(label)}</a></p>`;

const passwordBox = (pw: string) =>
  `<p style="margin:16px 0;padding:14px 16px;background:#f0f3f8;border-radius:8px;font-size:15px">Mật khẩu: <b style="font-family:Consolas,monospace;font-size:18px;letter-spacing:1px">${esc(pw)}</b></p>`;

export interface MailContent {
  template: string;
  subject: string;
  html: string;
}

export function accountCreatedMail(p: {
  fullName: string;
  cccdMasked: string;
  password: string;
  loginUrl: string;
}): MailContent {
  return {
    template: 'ACCOUNT_CREATED',
    subject: 'Tài khoản MQ Solutions của bạn',
    html: layout(
      'Đăng ký tài khoản thành công',
      `<p>Chào ${esc(p.fullName)},</p>
<p>Tài khoản đặt khám của bạn đã được tạo. Đăng nhập bằng <b>số CCCD ${esc(p.cccdMasked)}</b> hoặc số điện thoại đã đăng ký.</p>
${passwordBox(p.password)}
<p>Vì lý do bảo mật, bạn sẽ được yêu cầu <b>đổi mật khẩu</b> ở lần đăng nhập đầu tiên.</p>
${button(p.loginUrl, 'Đăng nhập')}`,
    ),
  };
}

export function passwordResetMail(p: { fullName: string; password: string; loginUrl: string }): MailContent {
  return {
    template: 'PASSWORD_RESET',
    subject: 'Mật khẩu mới cho tài khoản MQ Solutions',
    html: layout(
      'Cấp lại mật khẩu',
      `<p>Chào ${esc(p.fullName)},</p>
<p>Theo yêu cầu quên mật khẩu, hệ thống đã cấp mật khẩu mới. Mật khẩu cũ không còn dùng được và các thiết bị đang đăng nhập đã được đăng xuất.</p>
${passwordBox(p.password)}
<p>Bạn sẽ được yêu cầu đổi mật khẩu sau khi đăng nhập.</p>
${button(p.loginUrl, 'Đăng nhập')}`,
    ),
  };
}

export function passwordChangedMail(p: { fullName: string; at: string }): MailContent {
  return {
    template: 'PASSWORD_CHANGED',
    subject: 'Mật khẩu MQ Solutions vừa được thay đổi',
    html: layout(
      'Mật khẩu đã được thay đổi',
      `<p>Chào ${esc(p.fullName)},</p><p>Mật khẩu tài khoản của bạn đã được đổi lúc ${esc(p.at)}. Các thiết bị khác đã được đăng xuất.</p>
<p>Nếu không phải bạn thực hiện, hãy dùng chức năng <b>Quên mật khẩu</b> ngay hoặc gọi hotline.</p>`,
    ),
  };
}

export function emailChangedMail(p: { fullName: string; newEmailMasked: string }): MailContent {
  return {
    template: 'EMAIL_CHANGED',
    subject: 'Email nhận thông báo MQ Solutions đã được thay đổi',
    html: layout(
      'Email tài khoản đã thay đổi',
      `<p>Chào ${esc(p.fullName)},</p><p>Email nhận thông báo của tài khoản đã đổi sang <b>${esc(p.newEmailMasked)}</b>.</p>
<p>Nếu không phải bạn thực hiện, vui lòng gọi hotline để được hỗ trợ khóa tài khoản.</p>`,
    ),
  };
}
