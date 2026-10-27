'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import type {
  Encounter,
  EncounterDetail,
  Imaging,
  Prescription,
  Reexam,
  Test,
} from '@/lib/domain/records/types';
import { formatDate } from '@/lib/utils/format';
import { DetailSection, RecordRows, type RecordTab } from './record-rows';

// C04/W08: Client chỉ giữ dữ liệu hồ sơ đã rút gọn, không có MaBN đầy đủ.
type Rows = Encounter[] | Test[] | Imaging[] | Prescription[] | Reexam[];
type IdentityView = { status: 'FOUND' | 'MISMATCH' | 'NEW_PATIENT' | 'UNAVAILABLE'; maBNMasked?: string };

const TABS: { key: RecordTab; label: string }[] = [
  { key: 'encounters', label: 'Lần khám' },
  { key: 'tests', label: 'Xét nghiệm' },
  { key: 'imaging', label: 'CĐHA' },
  { key: 'prescriptions', label: 'Toa thuốc' },
  { key: 'reexams', label: 'Tái khám' },
];
const defaultFrom = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11, 1)).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);
const futureTo = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth() + 11, now.getDate())).toISOString().slice(0, 10);
};

export function RecordsPanel({
  code,
  name,
  identity,
}: {
  code: string;
  name: string;
  identity: IdentityView;
}) {
  const [tab, setTab] = useState<RecordTab>('encounters');
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(today);
  const [month, setMonth] = useState('');
  const [rows, setRows] = useState<Rows>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<EncounterDetail | null>(null);

  useEffect(() => {
    if (identity.status !== 'FOUND') return;
    let live = true;
    const query =
      tab === 'encounters'
        ? month
          ? `?mmyy=${month.slice(5, 7)}${month.slice(2, 4)}`
          : ''
        : `?from=${from}&to=${to}`;
    setBusy(true);
    setError(null);
    setRows([]);
    setDetail(null);
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
  }, [code, tab, month, from, to, identity.status]);

  async function openDetail(id: string) {
    setError(null);
    const query = month ? `?mmyy=${month.slice(5, 7)}${month.slice(2, 4)}` : '';
    try {
      setDetail(
        await apiFetch<EncounterDetail>(
          `/api/facilities/${encodeURIComponent(code)}/records/encounters/${encodeURIComponent(id)}${query}`,
        ),
      );
    } catch (err) {
      setError((err as ApiError).message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/tai-khoan/co-so"
            className="text-body-sm text-deep-cobalt underline-offset-4 hover:underline"
          >
            ← Cơ sở y tế
          </Link>
          <h1 className="text-[28px] leading-tight">Hồ sơ khám bệnh</h1>
          <p className="text-slate-gray">{name}</p>
          {identity.status === 'FOUND' && <Badge tone="info">Mã bệnh nhân {identity.maBNMasked}</Badge>}
        </div>
        <Button asChild>
          <Link href={`/dat-kham?co-so=${encodeURIComponent(code)}`}>Đặt khám</Link>
        </Button>
      </div>
      {identity.status !== 'FOUND' ? (
        <IdentityNotice status={identity.status} />
      ) : (
        <>
          <nav aria-label="Loại hồ sơ" className="border-border flex gap-2 overflow-x-auto border-b pb-3">
            {TABS.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-current={tab === item.key ? 'page' : undefined}
                onClick={() => {
                  setTab(item.key);
                  if (item.key === 'reexams') {
                    setFrom(today());
                    setTo(futureTo());
                  } else if (tab === 'reexams') {
                    setFrom(defaultFrom());
                    setTo(today());
                  }
                }}
                className={`text-body-sm shrink-0 rounded-md px-4 py-2 font-semibold ${tab === item.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <Card className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <CardTitle>{TABS.find((item) => item.key === tab)?.label}</CardTitle>
                <p className="text-body-sm text-slate-gray">Dữ liệu từ {name}</p>
              </div>
              {tab === 'encounters' ? (
                <label className="text-body-sm space-y-1 font-medium">
                  Tháng khám
                  <Input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    aria-label="Chọn tháng khám"
                  />
                  <span className="text-caption text-slate-gray block">
                    Để trống để xem 12 tháng gần nhất
                  </span>
                </label>
              ) : (
                <div className="grid w-full grid-cols-2 gap-2 sm:w-auto">
                  <label className="text-body-sm space-y-1 font-medium">
                    Từ ngày
                    <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </label>
                  <label className="text-body-sm space-y-1 font-medium">
                    Đến ngày
                    <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                  </label>
                </div>
              )}
            </div>
            {busy ? (
              <p role="status" className="text-slate-gray">
                Đang lấy hồ sơ…
              </p>
            ) : error ? (
              <Alert tone="danger">{error}</Alert>
            ) : rows.length === 0 ? (
              <p className="text-slate-gray">Chưa có kết quả trong khoảng thời gian này.</p>
            ) : (
              <RecordRows tab={tab} rows={rows} code={code} onDetail={openDetail} />
            )}
          </Card>
          {detail && (
            <Card className="space-y-5" aria-live="polite">
              <div className="space-y-1">
                <CardTitle>Chi tiết lần khám</CardTitle>
                <p>
                  {formatDate(detail.date)} · {detail.room}
                </p>
                <p>Bác sĩ: {detail.doctor || 'Chưa có thông tin'}</p>
                <p>Chẩn đoán: {detail.diagnosis || 'Chưa có thông tin'}</p>
              </div>
              <DetailSection title="Xét nghiệm" empty={detail.tests.length === 0}>
                <RecordRows tab="tests" rows={detail.tests} code={code} onDetail={openDetail} />
              </DetailSection>
              <DetailSection title="Chẩn đoán hình ảnh" empty={detail.imaging.length === 0}>
                <RecordRows tab="imaging" rows={detail.imaging} code={code} onDetail={openDetail} />
              </DetailSection>
              <DetailSection title="Toa thuốc" empty={detail.prescriptions.length === 0}>
                <RecordRows
                  tab="prescriptions"
                  rows={detail.prescriptions}
                  code={code}
                  onDetail={openDetail}
                />
              </DetailSection>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function IdentityNotice({ status }: { status: IdentityView['status'] }) {
  if (status === 'MISMATCH')
    return (
      <Alert tone="warning">
        Thông tin chưa khớp hồ sơ tại cơ sở. Vui lòng mang CCCD đến quầy tiếp đón để cập nhật.
      </Alert>
    );
  if (status === 'NEW_PATIENT') return <Alert>Bạn chưa có hồ sơ tại cơ sở này.</Alert>;
  return <Alert tone="warning">Chưa lấy được dữ liệu từ cơ sở, vui lòng thử lại sau.</Alert>;
}
