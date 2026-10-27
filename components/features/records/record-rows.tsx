'use client';

import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Encounter, Imaging, Prescription, Reexam, Test } from '@/lib/domain/records/types';
import { formatDate } from '@/lib/utils/format';

export type RecordTab = 'encounters' | 'tests' | 'imaging' | 'prescriptions' | 'reexams';
type Rows = Encounter[] | Test[] | Imaging[] | Prescription[] | Reexam[];

export function DetailSection({
  title,
  empty,
  children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="border-border border-t pt-4">
      <h3 className="text-2xl font-bold">{title}</h3>
      {empty ? <p className="text-body-sm text-slate-gray">Chưa có kết quả.</p> : children}
    </section>
  );
}

export function RecordRows({
  tab,
  rows,
  code,
  onDetail,
}: {
  tab: RecordTab;
  rows: Rows;
  code: string;
  onDetail: (id: string) => void;
}) {
  return (
    <div className="grid gap-3">
      {tab === 'encounters' &&
        (rows as Encounter[]).map((r) => (
          <article key={r.id} className="border-hairline bg-paper space-y-2 rounded-xl border p-4">
            <p className="font-semibold">
              {formatDate(r.date)} · {r.room || 'Lần khám'}
            </p>
            <p className="text-body-sm text-slate-gray">
              {r.doctor && `Bác sĩ: ${r.doctor} · `}
              {r.diagnosis || 'Chưa có chẩn đoán'}
            </p>
            <button
              className="text-body-sm text-deep-cobalt inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
              onClick={() => onDetail(r.id)}
            >
              Xem chi tiết
            </button>
          </article>
        ))}
      {tab === 'tests' &&
        (rows as Test[]).map((r, i) => (
          <article
            key={`${r.encounterId}-${i}`}
            className="border-hairline bg-paper space-y-2 rounded-xl border p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold">{r.name}</p>
              {r.abnormal && <Badge tone="warning">! Bất thường</Badge>}
            </div>
            <p className="text-body-sm">
              {r.result} {r.unit}
              {r.reference && ` · Tham chiếu: ${r.reference}`}
            </p>
            <p className="text-caption text-slate-gray">{r.date && formatDate(r.date)}</p>
            <FileLink url={r.fileUrl} />
          </article>
        ))}
      {tab === 'imaging' &&
        (rows as Imaging[]).map((r, i) => (
          <article
            key={`${r.encounterId}-${i}`}
            className="border-hairline bg-paper space-y-2 rounded-xl border p-4"
          >
            <p className="font-semibold">
              {r.name || 'Chẩn đoán hình ảnh'} · {r.date && formatDate(r.date)}
            </p>
            <p className="text-body-sm">{r.description}</p>
            <p className="text-body-sm font-medium">Kết luận: {r.conclusion || 'Chưa có'}</p>
            <FileLink url={r.fileUrl} />
          </article>
        ))}
      {tab === 'prescriptions' &&
        (rows as Prescription[]).map((r, i) => (
          <article
            key={`${r.encounterId}-${i}`}
            className="border-hairline bg-paper space-y-2 rounded-xl border p-4"
          >
            <p className="font-semibold">{r.name}</p>
            <p className="text-body-sm">
              {r.form && `${r.form} · `}Số lượng: {r.quantity || '—'}
            </p>
            <p className="text-body-sm text-slate-gray">
              Cách dùng: {r.dosage || 'Theo hướng dẫn của bác sĩ'}
            </p>
          </article>
        ))}
      {tab === 'reexams' &&
        (rows as Reexam[]).map((r, i) => (
          <article
            key={`${r.date}-${i}`}
            className="border-hairline bg-paper flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"
          >
            <div>
              <p className="font-semibold">Hẹn tái khám: {formatDate(r.date)}</p>
              <p className="text-body-sm text-slate-gray">Khoa: {r.specialtyCode || 'Theo phiếu hẹn'}</p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link
                href={`/dat-kham?co-so=${encodeURIComponent(code)}&chuyen-khoa=${encodeURIComponent(r.specialtyCode)}`}
              >
                Đặt khám tái khám
              </Link>
            </Button>
          </article>
        ))}
    </div>
  );
}

function FileLink({ url }: { url?: string }) {
  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-body-sm text-deep-cobalt inline-flex min-h-11 items-center font-semibold underline-offset-4 hover:underline"
    >
      Xem tệp kết quả (hết hạn sau 5 phút)
    </a>
  ) : null;
}
