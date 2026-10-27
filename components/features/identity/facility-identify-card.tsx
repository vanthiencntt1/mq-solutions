'use client';

import { BadgeCheck, CircleAlert, RefreshCw, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { FacilityLogo } from './facility-logo';

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
  logoUrl,
}: {
  code: string;
  name: string;
  address?: string;
  hint?: string;
  logoUrl?: string | null;
}) {
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(true);
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

  // Tự kiểm tra hồ sơ khi mở trang; kết quả định danh đã được cache phía server nên không dồn tải lên HIS.
  useEffect(() => {
    void identify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <Card className="space-y-5 transition-shadow hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <FacilityLogo name={name} logoUrl={logoUrl} />
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-xl">{name}</CardTitle>
            {address && <CardDescription>{address}</CardDescription>}
            {hint && <CardDescription>{hint}</CardDescription>}
          </div>
        </div>
      </div>
      <div className="border-hairline flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        {!view && busy ? (
          <Badge tone="neutral">
            <RefreshCw className="size-3.5 animate-spin" aria-hidden /> Đang kiểm tra hồ sơ…
          </Badge>
        ) : null}
        {!view && !busy ? <Badge tone="warning">Chưa kiểm tra được hồ sơ</Badge> : null}
        {view?.status === 'FOUND' ? (
          <Badge tone="success">
            <BadgeCheck className="size-3.5" aria-hidden /> Đã có hồ sơ · Mã BN {view.maBNMasked}
          </Badge>
        ) : null}
        {view?.status === 'MISMATCH' ? <Badge tone="warning">Thông tin chưa khớp</Badge> : null}
        {view?.status === 'NEW_PATIENT' ? <Badge tone="info">Chưa có hồ sơ</Badge> : null}
        {view?.status === 'UNAVAILABLE' ? <Badge tone="warning">Chưa kết nối</Badge> : null}
        {view?.status === 'FOUND' && (
          <Button asChild>
            <Link href={`/tai-khoan/co-so/${code}`}>Xem hồ sơ khám bệnh</Link>
          </Button>
        )}
        {!view && !busy && (
          <Button variant="outline" onClick={() => identify()}>
            Thử lại
          </Button>
        )}
      </div>

      {error && <Alert tone="danger">{error}</Alert>}

      {view?.status === 'FOUND' && (
        <div className="flex flex-wrap items-center gap-2">
          {view.hasVisited && <Badge tone="info">Có thể đặt BHYT</Badge>}
          <Button asChild variant="outline" size="sm">
            <Link href={`/dat-kham?co-so=${code}`}>Đặt khám</Link>
          </Button>
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
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
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
