import { formatInTimeZone } from 'date-fns-tz';

// Định dạng hiển thị chung (00-CONG-NGHE-QUY-UOC mục 10.10).
export const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const formatDate = (d: Date | string) => formatInTimeZone(new Date(d), TIME_ZONE, 'dd/MM/yyyy');
export const formatTime = (d: Date | string) => formatInTimeZone(new Date(d), TIME_ZONE, 'HH:mm');
export const formatDateTime = (d: Date | string) =>
  formatInTimeZone(new Date(d), TIME_ZONE, 'dd/MM/yyyy HH:mm');

/** 220000 → "220.000đ" */
export function formatMoney(vnd: number | bigint | string): string {
  const n = typeof vnd === 'string' ? Number(vnd) : Number(vnd);
  return `${Math.round(n).toLocaleString('vi-VN').replace(/,/g, '.')}đ`;
}

/** 0912345678 → "0912 345 678" */
export function formatPhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  return d.length === 10 ? `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}` : phone;
}

/** Che dữ liệu nhạy cảm, chỉ giữ 4 số cuối: CCCD "********1234", MaBN "****5678". */
export function maskTail(value: string, keep = 4): string {
  if (value.length <= keep) return value;
  return '*'.repeat(value.length - keep) + value.slice(-keep);
}

export const maskCccd = (cccd: string) => maskTail(cccd, 4);
export const maskMaBN = (maBN: string) => `****${maBN.slice(-4)}`;
export const maskPhone = (phone: string) => `${phone.slice(0, 3)}****${phone.slice(-3)}`;
export const maskName = (name: string) =>
  name.trim()
    ? name
        .trim()
        .split(/\s+/)
        .map((part) => `${part[0]}***`)
        .join(' ')
    : '';
/** nguyenvana@gmail.com → n***@gmail.com */
export function maskEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!user || !domain) return email;
  return `${user[0]}***@${domain}`;
}
