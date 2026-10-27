'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ChangePasswordSchema } from '@/lib/domain/account/schemas';

// Đổi mật khẩu – C01 mục 6. Lần đầu (mật khẩu được cấp) bắt buộc đổi trước khi dùng trang khác.
export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(ChangePasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await apiFetch('/api/auth/change-password', { body: values });
      reset();
      setDone(true);
      if (forced) {
        router.replace('/tai-khoan');
        router.refresh();
      }
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'AUTH_WRONG_PASSWORD') setError('oldPassword', { message: err.message });
      else if (err.code === 'AUTH_PASSWORD_POLICY') setError('newPassword', { message: err.message });
      else setServerError(err.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-md space-y-4">
      {forced && (
        <Alert tone="warning">
          Bạn đang dùng mật khẩu do hệ thống cấp. Vui lòng đặt mật khẩu mới để tiếp tục.
        </Alert>
      )}
      {done && !forced && <Alert tone="success">Đã đổi mật khẩu. Các thiết bị khác đã được đăng xuất.</Alert>}
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <FormField
        id="oldPassword"
        label={forced ? 'Mật khẩu trong email' : 'Mật khẩu hiện tại'}
        error={errors.oldPassword?.message}
      >
        <Input
          id="oldPassword"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.oldPassword}
          {...register('oldPassword')}
        />
      </FormField>
      <FormField
        id="newPassword"
        label="Mật khẩu mới"
        error={errors.newPassword?.message}
        hint="Ít nhất 8 ký tự, có chữ và số; không dùng CCCD, số điện thoại, năm sinh, ngày sinh."
      >
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.newPassword}
          {...register('newPassword')}
        />
      </FormField>
      <FormField id="confirmPassword" label="Nhập lại mật khẩu mới" error={errors.confirmPassword?.message}>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={!!errors.confirmPassword}
          {...register('confirmPassword')}
        />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Đang lưu…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  );
}
