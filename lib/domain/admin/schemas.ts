import { z } from 'zod';
import { PERMISSIONS } from './permissions';

const password = z.string().min(12, 'Mật khẩu tối thiểu 12 ký tự').max(128);
const totp = z.string().regex(/^\d{6}$/, 'Mã xác thực gồm 6 chữ số');
const email = z.string().trim().toLowerCase().max(120).pipe(z.email());

export const AdminLoginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
  totp: totp.optional(),
});
export type AdminLoginInput = z.infer<typeof AdminLoginSchema>;

export const AdminPasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: password,
  totp,
});
export type AdminPasswordInput = z.infer<typeof AdminPasswordSchema>;

export const AdminUserCreateSchema = z.object({
  email,
  name: z.string().trim().min(2).max(80),
  role: z.string().trim().min(1).max(80),
  facilityId: z.uuid().nullable(),
});
export type AdminUserCreateInput = z.infer<typeof AdminUserCreateSchema>;

export const AdminUserUpdateSchema = z.object({
  role: z.string().trim().min(1).max(80).optional(),
  facilityId: z.uuid().nullable().optional(),
  active: z.boolean().optional(),
});
export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>;

export const AdminUserIdSchema = z.object({ id: z.uuid() });
export const AdminRoleCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .regex(/^[A-Z][A-Z0-9_]{2,49}$/, 'Tên vai trò viết hoa, dùng dấu gạch dưới'),
  permissions: z
    .array(z.string().refine((v) => Object.values(PERMISSIONS).includes(v as never), 'Mã quyền không hợp lệ'))
    .min(1),
});
export type AdminRoleCreateInput = z.infer<typeof AdminRoleCreateSchema>;
export const AdminUserListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
