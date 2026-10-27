import { z } from 'zod';
import { CCCD_REGEX, PHONE_REGEX } from './cccd';

// Schema dùng chung client (form) và server (API) – C01 mục 3.

const currentYear = new Date().getFullYear();
const trimmed = () => z.string().trim();

export const cccdSchema = trimmed().regex(CCCD_REGEX, 'CCCD gồm 12 chữ số');
export const phoneSchema = trimmed().regex(PHONE_REGEX, 'Số điện thoại gồm 10 số, bắt đầu bằng 0');
export const emailSchema = trimmed()
  .toLowerCase()
  .pipe(z.email('Email không hợp lệ'))
  .pipe(z.string().max(120));
export const fullNameSchema = trimmed()
  .min(2, 'Nhập họ và tên')
  .max(80, 'Họ tên tối đa 80 ký tự')
  .regex(/^[\p{L}\s'.-]+$/u, 'Họ tên chỉ gồm chữ cái');
/** Ô trống / null (form) → undefined để báo "chưa nhập" thay vì bị ép thành 0. */
const emptyToUndefined = (v: unknown) => (v === '' || v === null || v === undefined ? undefined : Number(v));

export const birthYearSchema = z.preprocess(
  emptyToUndefined,
  z
    .number({ error: 'Nhập năm sinh' })
    .int('Năm sinh không hợp lệ')
    .min(1900, 'Năm sinh không hợp lệ')
    .max(currentYear, 'Năm sinh không hợp lệ'),
);

export const RegisterSchema = z.object({
  cccd: cccdSchema,
  fullName: fullNameSchema,
  birthYear: birthYearSchema,
  gender: z.preprocess(emptyToUndefined, z.union([z.literal(0), z.literal(1)], { error: 'Chọn giới tính' })),
  phone: phoneSchema,
  email: emailSchema,
  consent: z.literal(true, { error: 'Bạn cần đồng ý điều khoản và chính sách' }),
  captchaToken: z.string().optional(),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  username: trimmed().regex(/^(\d{12}|0\d{9})$/, 'Nhập CCCD (12 số) hoặc số điện thoại (10 số)'),
  password: z.string().min(1, 'Nhập mật khẩu').max(128),
  remember: z.boolean().optional(),
  captchaToken: z.string().optional(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, 'Nhập mật khẩu hiện tại'),
    newPassword: z.string().min(8, 'Tối thiểu 8 ký tự').max(72),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu nhập lại không khớp',
  })
  .refine((v) => v.newPassword !== v.oldPassword, {
    path: ['newPassword'],
    message: 'Mật khẩu mới phải khác mật khẩu cũ',
  });
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export const ForgotPasswordSchema = z.object({
  cccd: cccdSchema,
  birthYear: birthYearSchema,
  email: emailSchema,
  captchaToken: z.string().optional(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const UpdateProfileSchema = z.object({
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
  addressLine: trimmed().max(200).optional().or(z.literal('')),
  insuranceNo: trimmed()
    .regex(/^[A-Z]{2}\d{13}$/i, 'Số thẻ BHYT gồm 15 ký tự (2 chữ + 13 số)')
    .optional()
    .or(z.literal('')),
  currentPassword: z.string().optional(), // bắt buộc khi đổi Gmail (C01 mục 7)
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
