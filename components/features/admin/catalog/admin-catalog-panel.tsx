'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, Database, RefreshCw } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { formatDate, formatDateTime, formatMoney } from '@/lib/utils/format';

type Kind = 'specialties' | 'doctors' | 'rooms' | 'schedules' | 'prices';
type Facility = { id: string; code: string; name: string; status: string; health: string };
type View = { kind: string; rows: unknown[]; fetchedAt: string; source: 'his' | 'cache' | 'stale' };
type Specialty = { id: string; name: string };
type Doctor = { id: string; name: string; title?: string; specialtyHisId?: string };
type Room = {
  id: number;
  name: string;
  specialtyHisId: string;
  priceDv: number;
  priceBh: number;
  priceT7: number;
  priceCn: number;
};
type Schedule = { date: string; roomId: number; doctorId?: string; slotTime?: string };
type Slot = {
  id: number;
  startTime: string;
  endTime: string;
  startNumber: number;
  maxNumber: number;
  usedCount: number;
};
type Price = { ID: string; Name: string; Price: number };

const tabs: { kind: Kind; label: string }[] = [
  { kind: 'specialties', label: 'Chuyên khoa' },
  { kind: 'doctors', label: 'Bác sĩ' },
  { kind: 'rooms', label: 'Phòng khám' },
  { kind: 'schedules', label: 'Lịch' },
  { kind: 'prices', label: 'Bảng giá' },
];
const cell = 'border-border border-b px-3 py-2.5 align-top text-sm';
const healthLabel: Record<string, string> = {
  OK: 'Đang kết nối',
  DEGRADED: 'Kết nối chập chờn',
  DOWN: 'Mất kết nối',
  UNKNOWN: 'Chưa rõ',
};

export function AdminCatalogPanel({ facilities, canClear }: { facilities: Facility[]; canClear: boolean }) {
  const [facilityCode, setFacilityCode] = useState(facilities[0]?.code ?? '');
  const [kind, setKind] = useState<Kind>('specialties');
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const facility = facilities.find((item) => item.code === facilityCode);

  async function clearCache() {
    if (!facilityCode || pending) return;
    setPending(true);
    setNotice('');
    setError('');
    try {
      await apiFetch('/api/admin/catalog/clear', { method: 'POST', body: { facility: facilityCode } });
      setNotice('Đã xóa cache của cơ sở. Dữ liệu sẽ được lấy lại từ HIS.');
      setRevision((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Không thể xóa cache lúc này.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary flex items-center gap-2 text-sm font-semibold">
            <Database size={18} aria-hidden="true" /> A03 · DỮ LIỆU TỪ HIS
          </p>
          <h1 className="text-ink-navy mt-1 text-[28px] font-bold">Danh mục khám</h1>
          <p className="text-slate-gray mt-1 text-sm">
            Kiểm tra thông tin web đang nhận từ từng cơ sở. Cập nhật danh mục tại HIS của cơ sở.
          </p>
        </div>
        {canClear && facility ? (
          <Button type="button" variant="outline" disabled={pending} onClick={() => void clearCache()}>
            <RefreshCw size={18} aria-hidden="true" className={pending ? 'animate-spin' : ''} />
            {pending ? 'Đang xóa cache…' : 'Xóa cache cơ sở'}
          </Button>
        ) : null}
      </div>
      {notice ? (
        <Alert tone="success">
          <CheckCircle2 size={18} className="mr-2 inline" aria-hidden="true" />
          {notice}
        </Alert>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {facilities.length === 0 ? (
        <Card className="flex items-center gap-3 p-5">
          <AlertCircle size={20} aria-hidden="true" /> Không có cơ sở trong phạm vi bạn được xem.
        </Card>
      ) : (
        <>
          <Card className="p-4">
            <div className="flex flex-wrap items-end gap-4">
              <FormField id="catalog-facility" label="Cơ sở y tế" className="min-w-60 flex-1">
                <select
                  id="catalog-facility"
                  className="border-input bg-card text-foreground h-11 w-full rounded-md border px-3 text-sm"
                  value={facilityCode}
                  onChange={(event) => {
                    setFacilityCode(event.target.value);
                    setNotice('');
                    setError('');
                  }}
                >
                  {facilities.map((item) => (
                    <option key={item.id} value={item.code}>
                      {item.name} ({item.code})
                    </option>
                  ))}
                </select>
              </FormField>
              <Badge tone={facility?.health === 'DOWN' ? 'danger' : 'neutral'} className="mb-1">
                {facility?.health === 'DOWN' ? (
                  <AlertCircle size={14} aria-hidden="true" />
                ) : (
                  <Clock3 size={14} aria-hidden="true" />
                )}
                HIS: {healthLabel[facility?.health ?? 'UNKNOWN'] ?? 'Chưa rõ'}
              </Badge>
            </div>
          </Card>
          <div
            className="border-border bg-card overflow-x-auto rounded-xl border p-1"
            role="tablist"
            aria-label="Loại danh mục khám"
          >
            <div className="flex min-w-max gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.kind}
                  type="button"
                  role="tab"
                  id={`catalog-tab-${tab.kind}`}
                  aria-controls="catalog-panel"
                  aria-selected={kind === tab.kind}
                  className={`rounded-md px-4 py-3 text-sm font-semibold transition-colors ${kind === tab.kind ? 'bg-primary text-primary-foreground' : 'text-slate-gray hover:bg-muted'}`}
                  onClick={() => setKind(tab.kind)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <CatalogContent key={`${facilityCode}:${kind}:${revision}`} facility={facilityCode} kind={kind} />
        </>
      )}
    </div>
  );
}

function CatalogContent({ facility, kind }: { facility: string; kind: Kind }) {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void apiFetch<View>(`/api/admin/catalog?facility=${encodeURIComponent(facility)}&kind=${kind}`)
      .then((result) => {
        if (active) setView(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Không lấy được danh mục.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [facility, kind]);
  return (
    <Card className="min-h-72 p-0" role="tabpanel" id="catalog-panel" aria-labelledby={`catalog-tab-${kind}`}>
      <div className="border-border flex flex-wrap items-center justify-between gap-2 border-b px-4 py-4 sm:px-6">
        <h2 className="text-ink-navy text-lg font-semibold">
          {tabs.find((tab) => tab.kind === kind)?.label}
        </h2>
        {view ? <SourceBadge view={view} /> : null}
      </div>
      <div className="p-4 sm:p-6">
        {loading ? (
          <div role="status" className="text-slate-gray flex items-center gap-2 text-sm">
            <RefreshCw size={18} className="animate-spin" aria-hidden="true" /> Đang lấy danh mục từ cơ sở…
          </div>
        ) : error ? (
          <Alert tone="danger">
            <AlertCircle size={18} className="mr-2 inline" aria-hidden="true" />
            {error} Dữ liệu cũ quá 24 giờ sẽ không được hiển thị.
          </Alert>
        ) : view ? (
          <>
            {view.source === 'stale' ? (
              <div className="mb-4">
                <Alert tone="warning">
                  <AlertCircle size={18} className="mr-2 inline" aria-hidden="true" />
                  HIS đang lỗi kết nối. Đây là bản lưu lúc {formatDateTime(view.fetchedAt)}; hãy kiểm tra lại
                  sau.
                </Alert>
              </div>
            ) : null}
            {view.rows.length === 0 ? (
              <p className="text-slate-gray flex items-center gap-2 text-sm">
                <Database size={18} aria-hidden="true" /> Chưa có dữ liệu trong danh mục này.
              </p>
            ) : (
              <CatalogRows kind={kind} rows={view.rows} facility={facility} />
            )}
          </>
        ) : null}
      </div>
    </Card>
  );
}

function SourceBadge({ view }: { view: View }) {
  return (
    <Badge tone={view.source === 'stale' ? 'warning' : view.source === 'his' ? 'success' : 'neutral'}>
      <Clock3 size={14} aria-hidden="true" />
      {view.source === 'stale' ? 'Bản cũ' : view.source === 'his' ? 'Vừa lấy từ HIS' : 'Từ cache'} ·{' '}
      {formatDateTime(view.fetchedAt)}
    </Badge>
  );
}

function Table({ heads, children }: { heads: string[]; children: ReactNode }) {
  return (
    <div className="border-border overflow-x-auto rounded-lg border">
      <table className="w-full min-w-xl border-collapse">
        <thead>
          <tr>
            {heads.map((head) => (
              <th
                key={head}
                scope="col"
                className="border-border bg-muted text-slate-gray border-b px-3 py-2 text-left text-xs font-semibold"
              >
                {head}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function CatalogRows({ kind, rows, facility }: { kind: Kind; rows: unknown[]; facility: string }) {
  switch (kind) {
    case 'specialties':
      return (
        <Table heads={['Mã', 'Chuyên khoa']}>
          {(rows as Specialty[]).map((row) => (
            <tr key={row.id}>
              <td className={cell}>{row.id}</td>
              <td className={cell}>{row.name}</td>
            </tr>
          ))}
        </Table>
      );
    case 'doctors':
      return (
        <Table heads={['Mã bác sĩ', 'Họ tên', 'Chức danh', 'Mã chuyên khoa']}>
          {(rows as Doctor[]).map((row) => (
            <tr key={row.id}>
              <td className={cell}>{row.id}</td>
              <td className={cell}>{row.name}</td>
              <td className={cell}>{row.title ?? '—'}</td>
              <td className={cell}>{row.specialtyHisId ?? '—'}</td>
            </tr>
          ))}
        </Table>
      );
    case 'rooms':
      return (
        <Table heads={['Mã phòng', 'Phòng khám', 'Chuyên khoa', 'Dịch vụ', 'BHYT', 'Thứ 7', 'Chủ nhật']}>
          {(rows as Room[]).map((row) => (
            <tr key={row.id}>
              <td className={cell}>{row.id}</td>
              <td className={cell}>{row.name}</td>
              <td className={cell}>{row.specialtyHisId || '—'}</td>
              <td className={cell}>{formatMoney(row.priceDv)}</td>
              <td className={cell}>{formatMoney(row.priceBh)}</td>
              <td className={cell}>{formatMoney(row.priceT7)}</td>
              <td className={cell}>{formatMoney(row.priceCn)}</td>
            </tr>
          ))}
        </Table>
      );
    case 'schedules':
      return <ScheduleRows rows={rows as Schedule[]} facility={facility} />;
    case 'prices':
      return (
        <Table heads={['Mã', 'Tên dịch vụ', 'Giá']}>
          {(rows as Price[]).map((row) => (
            <tr key={row.ID}>
              <td className={cell}>{row.ID}</td>
              <td className={cell}>{row.Name}</td>
              <td className={cell}>{formatMoney(row.Price)}</td>
            </tr>
          ))}
        </Table>
      );
  }
}

function ScheduleRows({ rows, facility }: { rows: Schedule[]; facility: string }) {
  const requestId = useRef(0);
  const [selected, setSelected] = useState<{ room: number; date: string } | null>(null);
  const [slotView, setSlotView] = useState<View | null>(null);
  const [slotError, setSlotError] = useState('');
  const [slotLoading, setSlotLoading] = useState(false);
  async function showSlots(room: number, date: string) {
    const currentRequest = ++requestId.current;
    setSelected({ room, date });
    setSlotView(null);
    setSlotError('');
    setSlotLoading(true);
    try {
      const result = await apiFetch<View>(
        `/api/admin/catalog?facility=${encodeURIComponent(facility)}&kind=slots&room=${room}&date=${encodeURIComponent(date)}`,
      );
      if (currentRequest === requestId.current) setSlotView(result);
    } catch (cause) {
      if (currentRequest === requestId.current)
        setSlotError(cause instanceof ApiError ? cause.message : 'Không lấy được khung giờ.');
    } finally {
      if (currentRequest === requestId.current) setSlotLoading(false);
    }
  }
  return (
    <div className="space-y-5">
      <p className="text-slate-gray flex items-center gap-2 text-sm">
        <CalendarDays size={18} aria-hidden="true" /> Lịch 14 ngày tới. Chọn một dòng để xem dải số và số đã
        dùng.
      </p>
      <Table heads={['Ngày', 'Mã phòng', 'Mã bác sĩ', 'Buổi / khung', 'Khung giờ']}>
        {rows.map((row, index) => (
          <tr key={`${row.date}:${row.roomId}:${row.doctorId ?? ''}:${index}`}>
            <td className={cell}>{formatDate(`${row.date}T12:00:00+07:00`)}</td>
            <td className={cell}>{row.roomId}</td>
            <td className={cell}>{row.doctorId ?? '—'}</td>
            <td className={cell}>{row.slotTime ?? '—'}</td>
            <td className={cell}>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => void showSlots(row.roomId, row.date)}
              >
                Xem khung giờ
              </Button>
            </td>
          </tr>
        ))}
      </Table>
      {selected ? (
        <div className="border-border rounded-lg border p-4">
          <h3 className="text-ink-navy mb-3 text-base font-semibold">
            Phòng {selected.room} · {formatDate(`${selected.date}T12:00:00+07:00`)}
          </h3>
          {slotLoading ? (
            <p role="status" className="text-slate-gray text-sm">
              Đang lấy khung giờ…
            </p>
          ) : slotError ? (
            <Alert tone="danger">{slotError}</Alert>
          ) : slotView ? (
            <>
              <div className="mb-3">
                <SourceBadge view={slotView} />
              </div>
              {slotView.source === 'stale' ? (
                <Alert tone="warning">HIS đang lỗi kết nối; số đã dùng có thể đã thay đổi.</Alert>
              ) : null}
              {slotView.rows.length ? (
                <Table heads={['Khung giờ', 'Dải số', 'Số đã dùng']}>
                  {(slotView.rows as Slot[]).map((slot, index) => (
                    <tr key={`${slot.id}:${slot.startTime}:${index}`}>
                      <td className={cell}>
                        {slot.startTime}–{slot.endTime}
                      </td>
                      <td className={cell}>
                        {slot.startNumber}–{slot.maxNumber}
                      </td>
                      <td className={cell}>{slot.usedCount}</td>
                    </tr>
                  ))}
                </Table>
              ) : (
                <p className="text-slate-gray text-sm">Chưa có khung giờ cho phòng này.</p>
              )}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
