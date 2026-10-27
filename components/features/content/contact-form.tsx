'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Turnstile } from '@/components/features/auth/turnstile';
import { Button } from '@/components/ui/button';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ContactInputSchema, type ContactInput } from '@/lib/domain/content/contact';

export function ContactForm({ siteKey }: { siteKey?: string }) {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [captcha, setCaptcha] = useState<string | undefined>();
  const onToken = useCallback((token: string | undefined) => setCaptcha(token), []);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactInput>({ resolver: zodResolver(ContactInputSchema), defaultValues: { type: 'CO_SO' } });
  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await apiFetch<{ received: boolean }>('/api/contacts', { body: { ...values, captchaToken: captcha } });
      setSent(true);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.message : 'Chưa gửi được liên hệ, vui lòng thử lại.');
    }
  });
  if (sent)
    return (
      <div role="status" className="bg-success-bg rounded-xl p-6 text-center">
        <CheckCircle2 className="text-success mx-auto mb-3 size-10" aria-hidden />
        <h2 className="text-[24px]">Đã nhận thông tin hợp tác</h2>
        <p className="text-slate-gray mt-2">
          Bộ phận phụ trách sẽ liên hệ với bạn qua thông tin đã cung cấp.
        </p>
      </div>
    );
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {serverError && <Alert tone="danger">{serverError}</Alert>}
      <FormField id="type" label="Loại hợp tác" error={errors.type?.message}>
        <select
          id="type"
          {...register('type')}
          className="border-hairline bg-pebble text-ink-navy h-12 w-full rounded-lg border px-3"
        >
          <option value="CO_SO">Cơ sở y tế</option>
          <option value="PHONG_MACH">Phòng mạch</option>
          <option value="QUANG_CAO">Quảng cáo</option>
          <option value="KHAC">Khác</option>
        </select>
      </FormField>
      <FormField id="org" label="Tên đơn vị" error={errors.org?.message}>
        <Input id="org" autoComplete="organization" aria-invalid={!!errors.org} {...register('org')} />
      </FormField>
      <FormField id="name" label="Người liên hệ" error={errors.name?.message}>
        <Input id="name" autoComplete="name" aria-invalid={!!errors.name} {...register('name')} />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
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
        <FormField id="email" label="Email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            {...register('email')}
          />
        </FormField>
      </div>
      <FormField id="message" label="Nội dung hợp tác" error={errors.message?.message}>
        <textarea
          id="message"
          rows={5}
          aria-invalid={!!errors.message}
          {...register('message')}
          className="border-hairline bg-pebble text-ink-navy w-full rounded-lg border p-3"
        />
      </FormField>
      <Turnstile siteKey={siteKey} onToken={onToken} />
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? 'Đang gửi…' : 'Gửi thông tin hợp tác'}
      </Button>
    </form>
  );
}
