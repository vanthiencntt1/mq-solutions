'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, CalendarClock, ClipboardList, FileImage, FlaskConical, Pill, Search } from 'lucide-react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/form-field';
import { FacilityLogo } from '@/components/features/identity/facility-logo';
import type {
  Encounter,
  EncounterDetail,
  Imaging,
  Prescription,
  Reexam,
  Test,
} from '@/lib/domain/records/types';
import { RecordRows, type RecordTab } from './record-rows';
import { RecordDetailPane } from './record-detail-pane';

type Rows = Encounter[] | Test[] | Imaging[] | Prescription[] | Reexam[];
type IdentityView = { status: 'FOUND' | 'MISMATCH' | 'NEW_PATIENT' | 'UNAVAILABLE'; maBNMasked?: string };
const TABS: { key: RecordTab; label: string; icon: typeof ClipboardList }[] = [
  { key: 'encounters', label: 'Lần khám', icon: ClipboardList },
  { key: 'tests', label: 'Xét nghiệm', icon: FlaskConical },
  { key: 'imaging', label: 'CĐHA', icon: FileImage },
  { key: 'prescriptions', label: 'Đơn thuốc', icon: Pill },
  { key: 'reexams', label: 'Tái khám', icon: CalendarClock },
];
const today = () => new Date().toISOString().slice(0, 10);
const futureTo = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + 11, now.getDate())).toISOString().slice(0, 10);
};

export function RecordsPanel({
  code,
  name,
  logoUrl,
  identity,
}: {
  code: string;
  name: string;
  logoUrl?: string | null;
  identity: IdentityView;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('lan-kham');
  const [tab, setTab] = useState<RecordTab>('encounters');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Rows>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [detail, setDetail] = useState<EncounterDetail | null>(null);
  const [detailBusy, setDetailBusy] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (identity.status !== 'FOUND') return;
    let live = true;
    const query = tab === 'reexams' ? `?from=${today()}&to=${futureTo()}` : '';
    apiFetch<Rows>(`/api/facilities/${encodeURIComponent(code)}/records/${tab}${query}`)
      .then((data) => {
        if (live) setRows(data);
      })
      .catch((err: ApiError) => {
        if (live) setError(err.message);
      })
      .finally(() => {
        if (live) setBusy(false);
      });
    return () => {
      live = false;
    };
  }, [code, tab, retry, identity.status]);

  useEffect(() => {
    if (!selectedId || identity.status !== 'FOUND') return;
    let live = true;
    apiFetch<EncounterDetail>(
      `/api/facilities/${encodeURIComponent(code)}/records/encounters/${encodeURIComponent(selectedId)}`,
    )
      .then((data) => {
        if (live) setDetail(data);
      })
      .catch((err: ApiError) => {
        if (live) setDetailError(err.message);
      })
      .finally(() => {
        if (live) setDetailBusy(false);
      });
    return () => {
      live = false;
    };
  }, [code, selectedId, retry, identity.status]);

  const select = useCallback(
    (id: string) => {
      if (selectedId === id && detail) return;
      setDetail(null);
      setDetailError(null);
      setDetailBusy(true);
      router.replace(`${pathname}?lan-kham=${encodeURIComponent(id)}`, { scroll: false });
    },
    [pathname, router, selectedId, detail],
  );
  const close = useCallback(() => {
    setDetail(null);
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);
  const reload = () => {
    setBusy(true);
    setError(null);
    setDetailError(null);
    setDetailBusy(Boolean(selectedId));
    setRetry((v) => v + 1);
  };

  return (
    <div className="min-w-0 space-y-3 pb-8">
      <div className="flex min-h-16 flex-wrap items-center gap-3">
        <Link
          href="/tai-khoan/co-so"
          className="text-deep-cobalt focus-visible:ring-signal-blue inline-flex min-h-11 items-center gap-1 rounded-md text-sm font-semibold focus-visible:ring-2"
        >
          <ArrowLeft className="size-4" /> Cơ sở y tế
        </Link>
        <span className="bg-hairline hidden h-8 w-px sm:block" />
        <FacilityLogo name={name} logoUrl={logoUrl} />
        <div className="min-w-0 flex-1">
          <h1 className="text-ink-navy truncate text-lg font-bold">{name}</h1>
          {identity.status === 'FOUND' && (
            <p className="text-success text-sm font-semibold">✓ Mã BN {identity.maBNMasked}</p>
          )}
        </div>
        <Button asChild size="sm">
          <Link href={`/dat-kham?co-so=${encodeURIComponent(code)}`}>Đặt khám</Link>
        </Button>
      </div>
      {identity.status !== 'FOUND' ? (
        <Alert tone="warning">
          {identity.status === 'MISMATCH'
            ? 'Thông tin chưa khớp hồ sơ tại cơ sở.'
            : identity.status === 'NEW_PATIENT'
              ? 'Bạn chưa có hồ sơ tại cơ sở này.'
              : 'Chưa lấy được dữ liệu từ cơ sở, vui lòng thử lại sau.'}
        </Alert>
      ) : (
        <>
          <div className="bg-cloud border-hairline sticky top-16 z-20 flex flex-wrap items-center justify-between gap-2 border-b py-2 lg:top-[98px]">
            <nav aria-label="Loại hồ sơ" className="flex max-w-full gap-1 overflow-x-auto">
              {TABS.map((item) => (
                <button
                  key={item.key}
                  onClick={() => {
                    setTab(item.key);
                    setRows([]);
                    setBusy(true);
                    setError(null);
                    setSearch('');
                  }}
                  aria-current={tab === item.key ? 'page' : undefined}
                  className={`focus-visible:ring-signal-blue inline-flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 ${tab === item.key ? 'bg-primary text-primary-foreground' : 'text-ink-navy hover:bg-pebble'}`}
                >
                  <item.icon className="size-4" strokeWidth={1.75} aria-hidden />
                  {item.label}
                </button>
              ))}
            </nav>
            <label className="border-hairline bg-paper flex h-11 w-full items-center gap-2 rounded-lg border px-3 sm:w-56">
              <Search className="text-slate-gray size-4" aria-hidden />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Tìm trong hồ sơ"
                placeholder="Tìm trong hồ sơ"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
          </div>
          <div className="border-hairline bg-paper grid min-w-0 overflow-hidden rounded-2xl border lg:grid-cols-[400px_minmax(0,1fr)]">
            <div className={`${selectedId ? 'hidden lg:block' : ''} border-hairline min-w-0 lg:border-r`}>
              <div className="bg-paper border-hairline hidden min-h-11 items-center border-b px-4 text-sm font-semibold lg:flex">
                {TABS.find((v) => v.key === tab)?.label} · {rows.length}
              </div>
              <div className="lg:h-[calc(100dvh-240px)] lg:overflow-y-auto">
                {busy ? (
                  <div role="status" aria-label="Đang tải hồ sơ" className="space-y-1 p-3">
                    {Array.from({ length: 10 }, (_, i) => (
                      <div key={i} className="bg-pebble h-16 animate-pulse rounded-sm" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="p-4">
                    <Alert tone="danger">{error}</Alert>
                    <Button size="sm" variant="outline" onClick={reload} className="mt-3">
                      Thử lại
                    </Button>
                  </div>
                ) : rows.length ? (
                  <RecordRows
                    tab={tab}
                    rows={rows}
                    code={code}
                    onDetail={select}
                    selectedId={selectedId ?? undefined}
                    search={search}
                  />
                ) : (
                  <p className="text-slate-gray p-5 text-sm">
                    Cơ sở chưa có dữ liệu loại này trong hồ sơ của bạn.
                  </p>
                )}
              </div>
            </div>
            <aside
              className={`${selectedId ? '' : 'hidden lg:block'} min-w-0 lg:h-[calc(100dvh-196px)] lg:overflow-y-auto`}
              aria-live="polite"
            >
              {detailBusy ? (
                <div role="status" aria-label="Đang tải chi tiết" className="space-y-3 p-6">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="bg-pebble h-12 animate-pulse" />
                  ))}
                </div>
              ) : detailError ? (
                <div className="p-6">
                  <Alert tone="danger">{detailError}</Alert>
                  <Button variant="outline" size="sm" onClick={reload} className="mt-3">
                    Thử lại
                  </Button>
                </div>
              ) : detail ? (
                <RecordDetailPane detail={detail} code={code} onBack={close} />
              ) : (
                <p className="text-slate-gray p-8 text-center text-sm">
                  Chọn một dòng để xem chi tiết lần khám.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
