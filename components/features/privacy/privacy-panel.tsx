'use client';

import { CheckCircle2, Download, ShieldCheck, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { IconTile } from '@/components/ui/icon-tile';

interface DeletionResult {
  requestedAt: string;
  pending: boolean;
}

// C10: yêu cầu xóa cần xác nhận rõ và mật khẩu hiện tại; không gửi dữ liệu định danh vào URL.
export function PrivacyPanel({ initialRequestedAt }: { initialRequestedAt: string | null }) {
  const [requestedAt, setRequestedAt] = useState(initialRequestedAt);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState<'export' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function downloadData() {
    setBusy('export');
    setError(null);
    try {
      const data = await apiFetch<unknown>('/api/me/privacy/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'du-lieu-mq-solutions.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa tải được dữ liệu, vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  }

  async function requestDeletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('delete');
    setError(null);
    try {
      const result = await apiFetch<DeletionResult>('/api/me/privacy/deletion-request', {
        method: 'POST',
        body: { password, confirmation },
      });
      setRequestedAt(result.requestedAt);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa gửi được yêu cầu, vui lòng thử lại.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card variant="panel" className="space-y-6">
      <div className="flex items-start gap-3">
        <IconTile>
          <ShieldCheck aria-hidden="true" />
        </IconTile>
        <div>
          <h2 className="section-title">Quyền riêng tư của bạn</h2>
          <p className="text-body-sm text-slate-gray mt-1">
            Tải bản sao thông tin tài khoản và lịch đặt khám trên MQ Solutions. Thông tin định danh trong tệp
            được che một phần.
          </p>
        </div>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      <Button type="button" variant="outline" disabled={busy !== null} onClick={downloadData}>
        <Download aria-hidden="true" /> {busy === 'export' ? 'Đang chuẩn bị…' : 'Tải dữ liệu của tôi'}
      </Button>

      <div className="border-hairline space-y-4 border-t pt-6">
        <div className="flex items-start gap-3">
          <Trash2 className="text-danger mt-0.5 size-5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-xl font-bold">Yêu cầu xóa tài khoản</h3>
            <p className="text-body-sm text-slate-gray mt-1">
              Chúng tôi tiếp nhận yêu cầu để kiểm tra và xử lý. Lịch sử khám, thanh toán cần lưu theo quy định
              sẽ được xem xét riêng.
            </p>
          </div>
        </div>
        {requestedAt ? (
          <Alert tone="success">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" /> Đã tiếp nhận yêu cầu xóa tài
              khoản và đang chờ xử lý.
            </span>
          </Alert>
        ) : (
          <form onSubmit={requestDeletion} className="space-y-4">
            <FormField id="privacy-password" label="Mật khẩu hiện tại">
              <Input
                id="privacy-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </FormField>
            <FormField id="privacy-confirmation" label="Nhập XOA TAI KHOAN để xác nhận">
              <Input
                id="privacy-confirmation"
                type="text"
                autoComplete="off"
                required
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
              />
            </FormField>
            <Button
              type="submit"
              variant="danger"
              disabled={busy !== null || confirmation !== 'XOA TAI KHOAN'}
            >
              <Trash2 aria-hidden="true" /> {busy === 'delete' ? 'Đang gửi…' : 'Gửi yêu cầu xóa'}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
}
