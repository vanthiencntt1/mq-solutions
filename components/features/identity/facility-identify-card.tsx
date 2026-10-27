'use client';

import { BadgeCheck, CircleAlert, RefreshCw, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';

// Tra hồ sơ tại một cơ sở – C03. MaBN chỉ hiện dạng che; trình duyệt không giữ MaBN đầy đủ.
type View = {
  status: 'FOUND' | 'MISMATCH' | 'NEW_PATIENT' | 'UNAVAILABLE';
  maBNMasked?: string;
  hasVisited?: boolean;
};

export function FacilityIdentifyCard({
  code,
  name,
  address,
  hint,
}: {
  code: string;
  name: string;
  address?: string;
  hint?: string;
}) {
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maBN, setMaBN] = useState('');

  async function run(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      setView(await apiFetch<View>(url, { body: body ?? {} }));
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  const identify = (refresh = false) => run(`/api/facilities/${code}/identify`, { refresh });

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle>{name}</CardTitle>
          {address && <CardDescription>{address}</CardDescription>}
          {hint && <CardDescription>{hint}</CardDescription>}
        </div>
        {!view && (
          <Button variant="outline" disabled={busy} onClick={() => identify()}>
            {busy ? 'Đang tra cứu…' : 'Tra hồ sơ'}
          </Button>
        )}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {view?.status === 'FOUND' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="success">
              <BadgeCheck className="size-3.5" aria-hidden /> Đã có hồ sơ
            </Badge>
            <span className="text-body-sm text-slate-gray">Mã bệnh nhân {view.maBNMasked}</span>
            {view.hasVisited && <Badge tone="info">Có thể đặt BHYT</Badge>}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href={`/dat-kham?co-so=${code}`}>Đặt khám</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/tai-khoan/co-so/${code}`}>Xem hồ sơ khám bệnh</Link>
            </Button>
          </div>
        </div>
      )}

      {view?.status === 'NEW_PATIENT' && (
        <div className="space-y-3">
          <Badge tone="info">
            <UserPlus className="size-3.5" aria-hidden /> Bệnh nhân mới
          </Badge>
          <p className="text-body-sm text-slate-gray">
            Bạn chưa có hồ sơ tại cơ sở này. Vẫn đặt khám dịch vụ được, hồ sơ sẽ được tạo khi xác nhận đặt
            khám.
          </p>
          <Button asChild>
            <Link href={`/dat-kham?co-so=${code}`}>Đặt khám</Link>
          </Button>
          <ManualMaBN value={maBN} onChange={setMaBN} busy={busy} onSubmit={byMaBN} />
        </div>
      )}

      {view?.status === 'MISMATCH' && (
        <div className="space-y-3">
          <Alert tone="warning">
            <CircleAlert className="mr-1 inline size-4 align-text-bottom" aria-hidden />
            Thông tin chưa khớp hồ sơ tại cơ sở. Vui lòng mang CCCD đến quầy tiếp đón để cập nhật, hoặc nhập
            mã bệnh nhân bên dưới nếu bạn có.
          </Alert>
          <ManualMaBN value={maBN} onChange={setMaBN} busy={busy} onSubmit={byMaBN} />
        </div>
      )}

      {view?.status === 'UNAVAILABLE' && (
        <Alert tone="warning">Chưa kết nối được cơ sở, vui lòng thử lại sau ít phút.</Alert>
      )}

      {view && (
        <Button variant="ghost" size="sm" disabled={busy} onClick={() => identify(true)}>
          <RefreshCw aria-hidden /> Tải lại
        </Button>
      )}
    </Card>
  );

  function byMaBN() {
    return run(`/api/facilities/${code}/identify/by-mabn`, { maBN: maBN.trim() });
  }
}

function ManualMaBN({
  value,
  onChange,
  busy,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  busy: boolean;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="maBN" className="text-body-sm font-medium">
        Đã từng khám tại đây? Nhập mã bệnh nhân in trên phiếu khám / hóa đơn
      </label>
      <div className="flex gap-2">
        <Input
          id="maBN"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Mã bệnh nhân"
        />
        <Button type="submit" variant="outline" disabled={busy || value.trim().length < 6}>
          Kiểm tra
        </Button>
      </div>
    </form>
  );
}
