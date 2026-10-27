'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, LockKeyhole, ShieldCheck } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Alert } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

export function AdminLoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [setupUri, setSetupUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      const result = await apiFetch<{ authenticated?: boolean; setupUri?: string }>('/api/admin/auth/login', {
        method: 'POST',
        body: { email, password, ...(totp ? { totp } : {}) },
      });
      if (result.setupUri) {
        setSetupUri(result.setupUri);
        return;
      }
      const destination =
        next?.startsWith('/admin') && !next.startsWith('//') && !next.startsWith('/admin/dang-nhap')
          ? next
          : '/admin';
      router.replace(destination);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không thể đăng nhập lúc này');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="space-y-2">
        <span className="text-primary inline-flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck size={18} /> KHU VỰC QUẢN TRỊ
        </span>
        <h1 className="text-ink-navy text-[28px] font-bold">Đăng nhập quản trị</h1>
        <p className="text-slate-gray text-sm">Dùng tài khoản nhân viên và ứng dụng xác thực 2FA.</p>
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {setupUri ? (
        <Alert tone="info">
          <span className="inline-flex items-center gap-2 font-semibold">
            <KeyRound size={18} /> Thiết lập 2FA lần đầu
          </span>
          <p className="mt-2">
            Thêm tài khoản trong ứng dụng xác thực bằng URI sau, rồi nhập mã 6 chữ số để hoàn tất.
          </p>
          <code className="mt-2 block rounded bg-white/60 p-2 text-xs break-all select-all">{setupUri}</code>
        </Alert>
      ) : null}
      <FormField id="admin-email" label="Email">
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </FormField>
      <FormField id="admin-password" label="Mật khẩu">
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </FormField>
      <FormField
        id="admin-totp"
        label="Mã xác thực 2FA"
        hint="Tài khoản mới: nhập mật khẩu trước để nhận thông tin thiết lập."
      >
        <Input
          id="admin-totp"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={totp}
          onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
        />
      </FormField>
      <Button type="submit" className="w-full" disabled={pending}>
        <LockKeyhole size={18} />
        {pending ? 'Đang xác thực…' : setupUri ? 'Xác nhận 2FA' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
