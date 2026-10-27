'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ForgotPasswordSchema } from '@/lib/domain/account/schemas';
import { Turnstile } from './turnstile';

// Quên mật khẩu: khớp CCCD + năm sinh + Gmail → cấp mật khẩu mới qua Gmail (C01 mục 6).
export function ForgotForm({ siteKey }: { siteKey?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | undefined>();
  const onToken = useCallback((t: string | undefined) => setCaptcha(t), []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(ForgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const r = await apiFetch<{ message: string }>('/api/auth/forgot-password', {
        body: { ...values, captchaToken: captcha },
      });
      setMessage(r.message);
    } catch (e) {
      setServerError((e as ApiError).message);
    }
  });

  if (message) {
    return (
      <div className="space-y-4">
        <h1 className="text-[24px]">Kiểm tra Gmail</h1>
        <Alert tone="success">{message}</Alert>
        <Button asChild className="w-full">
          <Link href="/dang-nhap">Về trang đăng nhập</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-[24px]">Quên mật khẩu</h1>
        <p className="text-body-sm text-slate-gray">
          Nhập đúng thông tin đã đăng ký, hệ thống sẽ gửi mật khẩu mới về Gmail.
        </p>
      </div>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <FormField id="cccd" label="Số CCCD" error={errors.cccd?.message}>
        <Input
          id="cccd"
          inputMode="numeric"
          maxLength={12}
          aria-invalid={!!errors.cccd}
          {...register('cccd')}
        />
      </FormField>
      <FormField id="birthYear" label="Năm sinh" error={errors.birthYear?.message}>
        <Input
          id="birthYear"
          inputMode="numeric"
          maxLength={4}
          aria-invalid={!!errors.birthYear}
          {...register('birthYear')}
        />
      </FormField>
      <FormField id="email" label="Gmail đã đăng ký" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </FormField>
      <Turnstile siteKey={siteKey} onToken={onToken} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang gửi…' : 'Gửi mật khẩu mới'}
      </Button>
      <p className="text-body-sm text-slate-gray text-center">
        Không nhớ Gmail đã đăng ký? Mang CCCD đến quầy cơ sở để nhân viên hỗ trợ.
      </p>
    </form>
  );
}
