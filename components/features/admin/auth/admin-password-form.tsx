'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { LockKeyhole } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Alert, FormField } from '@/components/ui/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function AdminPasswordForm() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [totp, setTotp] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (newPassword !== confirm) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    setPending(true);
    setError('');
    try {
      await apiFetch('/api/admin/auth/change-password', {
        method: 'POST',
        body: { oldPassword, newPassword, totp },
      });
      router.replace('/admin/dang-nhap?changed=1');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không thể đổi mật khẩu');
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <h1 className="text-ink-navy text-[28px] font-bold">Đổi mật khẩu quản trị</h1>
      <p className="text-slate-gray text-sm">Sau khi đổi, mọi phiên quản trị sẽ hết hiệu lực.</p>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <FormField id="old-password" label="Mật khẩu hiện tại">
        <Input
          id="old-password"
          type="password"
          required
          autoComplete="current-password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
        />
      </FormField>
      <FormField id="new-password" label="Mật khẩu mới" hint="Tối thiểu 12 ký tự">
        <Input
          id="new-password"
          type="password"
          minLength={12}
          required
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </FormField>
      <FormField id="confirm-password" label="Nhập lại mật khẩu mới">
        <Input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </FormField>
      <FormField id="change-totp" label="Mã xác thực 2FA">
        <Input
          id="change-totp"
          inputMode="numeric"
          pattern="[0-9]{6}"
          required
          value={totp}
          onChange={(e) => setTotp(e.target.value.replace(/\D/g, ''))}
        />
      </FormField>
      <Button type="submit" disabled={pending} className="w-full">
        <LockKeyhole size={18} /> {pending ? 'Đang lưu…' : 'Đổi mật khẩu'}
      </Button>
    </form>
  );
}
