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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maBN, setMaBN] = useState('');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`mq_identify_${code}`);
      if (!cached) return;
      const value = JSON.parse(cached) as View & { at: number };
      if (
        Date.now() - value.at < 15 * 60_000 &&
        ['FOUND', 'MISMATCH', 'NEW_PATIENT', 'UNAVAILABLE'].includes(value.status)
      ) {
        setView({ status: value.status, maBNMasked: value.maBNMasked, hasVisited: value.hasVisited });
      } else sessionStorage.removeItem(`mq_identify_${code}`);
    } catch {
      /* Storage may be disabled. */
    }
  }, [code]);

  async function run(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const result = await apiFetch<View>(url, { body: body ?? {} });
      setView(result);
      try {
        sessionStorage.setItem(
          `mq_identify_${code}`,
          JSON.stringify({
            status: result.status,
            maBNMasked: result.maBNMasked,
            hasVisited: result.hasVisited,
            at: Date.now(),
          }),
        );
      } catch {
        /* Storage may be disabled. */
      }
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  }
  const identify = (refresh = false) => run(`/api/facilities/${code}/identify`, { refresh });

  return (
    <Card
      className={`relative space-y-3 overflow-hidden rounded-2xl p-4 md:px-5 ${view ? `border-l-4 ${view.status === 'FOUND' ? 'border-l-success' : view.status === 'NEW_PATIENT' ? 'border-l-info' : 'border-l-warning'}` : ''}`}
    >
      <div className="flex min-h-19 flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <FacilityLogo name={name} logoUrl={logoUrl} />
          <div className="min-w-0 space-y-1">
            <CardTitle className="text-lg">{name}</CardTitle>
            {address && <CardDescription>{address}</CardDescription>}
            {hint && <CardDescription>{hint}</CardDescription>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {view?.status === 'FOUND' ? (
            <Badge tone="success">
              <BadgeCheck className="size-3.5" aria-hidden /> Đã có hồ sơ · Mã BN {view.maBNMasked}
            </Badge>
          ) : null}
          {view?.status === 'MISMATCH' ? <Badge tone="warning">Thông tin chưa khớp</Badge> : null}
          {view?.status === 'NEW_PATIENT' ? <Badge tone="info">Chưa có hồ sơ</Badge> : null}
          {view?.status === 'UNAVAILABLE' ? <Badge tone="warning">Chưa kết nối</Badge> : null}
          {view?.status === 'FOUND' && (
            <Button asChild size="sm">
              <Link href={`/tai-khoan/co-so/${code}`}>Xem hồ sơ</Link>
            </Button>
          )}
          {!view && !busy && (
            <Button variant="outline" size="sm" onClick={() => void identify()}>
              Kiểm tra hồ sơ
            </Button>
          )}
          {busy && (
            <Button variant="outline" size="sm" disabled className="min-w-40">
              <RefreshCw className="animate-spin" aria-hidden /> Đang kiểm tra…
            </Button>
          )}
          {view && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Tải lại hồ sơ ${name}`}
              disabled={busy}
              onClick={() => void identify(true)}
            >
              <RefreshCw aria-hidden />
            </Button>
          )}
          {(view?.status === 'NEW_PATIENT' || view?.status === 'MISMATCH') && (
            <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)}>
              {expanded ? 'Thu gọn' : 'Nhập mã BN'}
            </Button>
          )}
        </div>
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

      {(view?.status === 'NEW_PATIENT' || view?.status === 'MISMATCH') && (
        <div
          className={`grid transition-[grid-template-rows] duration-[180ms] motion-reduce:transition-none ${expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
          aria-hidden={!expanded}
          inert={!expanded}
        >
          <div className="min-h-0 overflow-hidden">
            {view.status === 'NEW_PATIENT' && (
              <div className="space-y-3 pt-2">
                <Badge tone="info">
                  <UserPlus className="size-3.5" aria-hidden /> Bệnh nhân mới
                </Badge>
                <p className="text-body-sm text-slate-gray">
                  Bạn chưa có hồ sơ tại cơ sở này. Vẫn đặt khám dịch vụ được, hồ sơ sẽ được tạo khi xác nhận
                  đặt khám.
                </p>
                <Button asChild>
                  <Link href={`/dat-kham?co-so=${code}`}>Đặt khám</Link>
                </Button>
                <ManualMaBN id={code} value={maBN} onChange={setMaBN} busy={busy} onSubmit={byMaBN} />
              </div>
            )}

            {view.status === 'MISMATCH' && (
              <div className="space-y-3 pt-2">
                <Alert tone="warning">
                  <CircleAlert className="mr-1 inline size-4 align-text-bottom" aria-hidden />
                  Thông tin chưa khớp hồ sơ tại cơ sở. Vui lòng mang CCCD đến quầy tiếp đón để cập nhật, hoặc
                  nhập mã bệnh nhân bên dưới nếu bạn có.
                </Alert>
                <ManualMaBN id={code} value={maBN} onChange={setMaBN} busy={busy} onSubmit={byMaBN} />
              </div>
            )}
          </div>
        </div>
      )}

      {view?.status === 'UNAVAILABLE' && (
        <Alert tone="warning">Chưa kết nối được cơ sở, vui lòng thử lại sau ít phút.</Alert>
      )}
    </Card>
  );

  function byMaBN() {
    return run(`/api/facilities/${code}/identify/by-mabn`, { maBN: maBN.trim() });
  }
}

function ManualMaBN({
  id,
  value,
  onChange,
  busy,
  onSubmit,
}: {
  id: string;
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
      <label htmlFor={`maBN-${id}`} className="text-body-sm font-medium">
        Đã từng khám tại đây? Nhập mã bệnh nhân in trên phiếu khám / hóa đơn
      </label>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <Input
          id={`maBN-${id}`}
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
