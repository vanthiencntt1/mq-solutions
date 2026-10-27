'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { RegisterSchema } from '@/lib/domain/account/schemas';
import { Turnstile } from './turnstile';

// Đăng ký tài khoản – C01 mục 4. Mật khẩu do hệ thống cấp, gửi qua Gmail.
export function RegisterForm({ siteKey }: { siteKey?: string }) {
  const [done, setDone] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | undefined>();
  const onToken = useCallback((t: string | undefined) => setCaptcha(t), []);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { consent: false as unknown as true },
  });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      const r = await apiFetch<{ emailMasked: string }>('/api/auth/register', {
        body: { ...values, captchaToken: captcha },
      });
      setDone(r.emailMasked);
    } catch (e) {
      const err = e as ApiError;
      if (err.code === 'ACCOUNT_CCCD_MISMATCH') setError('cccd', { message: err.message });
      else setServerError(err.message);
    }
  });

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="text-success mx-auto size-12" aria-hidden />
        <h1 className="text-[40px] leading-tight font-bold">Đăng ký thành công</h1>
        <p className="text-slate-gray">
          Mật khẩu đã được gửi tới <b className="text-ink-navy">{done}</b>. Kiểm tra cả thư mục Spam / Quảng
          cáo nếu chưa thấy.
        </p>
        <Button asChild className="w-full">
          <Link href="/dang-nhap">Đăng nhập</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-[40px] leading-tight font-bold">Đăng ký tài khoản</h1>
        <p className="text-body-sm text-slate-gray">
          Một tài khoản CCCD dùng để đặt khám và xem hồ sơ tại mọi cơ sở.
        </p>
      </div>
      {serverError && <Alert tone="danger">{serverError}</Alert>}

      <FormField
        id="cccd"
        label="Số CCCD"
        error={errors.cccd?.message}
        hint="12 chữ số trên căn cước công dân"
      >
        <Input
          id="cccd"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          aria-invalid={!!errors.cccd}
          {...register('cccd')}
        />
      </FormField>
      <FormField
        id="fullName"
        label="Họ và tên"
        error={errors.fullName?.message}
        hint="Ghi đúng như trên CCCD"
      >
        <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...register('fullName')} />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField id="birthYear" label="Năm sinh" error={errors.birthYear?.message}>
          <Input
            id="birthYear"
            inputMode="numeric"
            maxLength={4}
            aria-invalid={!!errors.birthYear}
            {...register('birthYear')}
          />
        </FormField>
        <fieldset className="space-y-1.5">
          <legend className="text-body-sm font-medium">Giới tính</legend>
          <div className="flex h-11 items-center gap-4">
            <label className="text-body-sm flex items-center gap-2">
              <input type="radio" value="1" className="accent-primary size-4" {...register('gender')} /> Nam
            </label>
            <label className="text-body-sm flex items-center gap-2">
              <input type="radio" value="0" className="accent-primary size-4" {...register('gender')} /> Nữ
            </label>
          </div>
          {errors.gender && <p className="text-body-sm text-danger">{errors.gender.message}</p>}
        </fieldset>
      </div>
      <FormField id="phone" label="Số điện thoại" error={errors.phone?.message}>
        <Input
          id="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={10}
          aria-invalid={!!errors.phone}
          {...register('phone')}
        />
      </FormField>
      <FormField id="email" label="Gmail nhận mật khẩu" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
      </FormField>

      <label className="text-body-sm text-ink-navy flex items-start gap-3">
        <input type="checkbox" className="accent-primary mt-0.5 size-4" {...register('consent')} />
        <span>
          Tôi đồng ý{' '}
          <Link href="/chinh-sach/dieu-khoan-su-dung" className="font-semibold underline" target="_blank">
            Điều khoản sử dụng
          </Link>{' '}
          và{' '}
          <Link href="/chinh-sach/chinh-sach-bao-mat" className="font-semibold underline" target="_blank">
            Chính sách xử lý dữ liệu cá nhân
          </Link>
          .
        </span>
      </label>
      {errors.consent && <p className="text-body-sm text-danger">{errors.consent.message}</p>}

      <Turnstile siteKey={siteKey} onToken={onToken} />
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Đang tạo tài khoản…' : 'Đăng ký'}
      </Button>
      <p className="text-body-sm text-slate-gray text-center">
        Đã có tài khoản?{' '}
        <Link href="/dang-nhap" className="text-primary font-semibold">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
}
