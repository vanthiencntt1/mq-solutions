// Tên cookie dùng chung cho middleware, Route Handler và trang (C01 mục 8).
export const PATIENT_COOKIE = 'mq_session'; // JWT, HttpOnly
export const PATIENT_HINT_COOKIE = 'mq_auth'; // "1" – không bí mật, chỉ để header biết đã đăng nhập (giữ trang công khai tĩnh)
export const ADMIN_COOKIE = 'mq_admin';

export const SESSION_MAX_AGE = { normal: 12 * 3600, remember: 7 * 24 * 3600 } as const;

/** Phiên bản Điều khoản + Chính sách xử lý dữ liệu đang áp dụng (C01 mục 4, W07). */
export const CONSENT_VERSION = '2026-10';
