'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { LoginSchema } from '@/lib/domain/account/schemas';
import { Turnstile } from './turnstile';

// Đăng nhập bằng CCCD hoặc SĐT – C01 mục 5.
export function LoginForm({ siteKey, next }: { siteKey?: string; next: string }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState<string | undefined>();
  const [show, setShow] = useState(false);
  const onToken = useCallback((t: string | undefined) => setCaptcha(t), []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(LoginSchema), defaultValues: { remember: false } });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const r = await apiFetch<{ mustChangePassword: boolean }>('/api/auth/login', {
        body: { ...values, captchaToken: captcha },
      });
      router.replace(r.mustChangePassword ? '/tai-khoan/doi-mat-khau' : next);
      router.refresh();
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'CAPTCHA_FAILED') setNeedCaptcha(true);
      setServerError(err.message);
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-[24px]">Đăng nhập</h1>
        <p className="text-body-sm text-slate-gray">Dùng số CCCD hoặc số điện thoại đã đăng ký.</p>
      </div>
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <FormField id="username" label="CCCD hoặc số điện thoại" error={errors.username?.message}>
        <Input
          id="username"
          inputMode="numeric"
          autoComplete="username"
          maxLength={12}
          aria-invalid={!!errors.username}
          {...register('username')}
        />
      </FormField>
      <FormField id="password" label="Mật khẩu" error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            className="pr-11"
            aria-invalid={!!errors.password}
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="text-slate-gray absolute inset-y-0 right-0 grid w-11 place-items-center"
            aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </FormField>
      <div className="flex items-center justify-between">
        <label className="text-body-sm flex items-center gap-2">
          <input type="checkbox" className="accent-primary size-4" {...register('remember')} /> Ghi nhớ 7 ngày
        </label>
        <Link href="/quen-mat-khau" className="text-body-sm text-primary font-semibold">
          Quên mật khẩu?
        </Link>
      </div>
      {needCaptcha && <Turnstile siteKey={siteKey} onToken={onToken} />}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}
      </Button>
      <p className="text-body-sm text-slate-gray text-center">
        Chưa có tài khoản?{' '}
        <Link href="/dang-ky" className="text-primary font-semibold">
          Đăng ký
        </Link>
      </p>
    </form>
  );
}
