'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Encounter, Imaging, Prescription, Reexam, Test } from '@/lib/domain/records/types';
import { formatDate } from '@/lib/utils/format';

export type RecordTab = 'encounters' | 'tests' | 'imaging' | 'prescriptions' | 'reexams';
type Rows = Encounter[] | Test[] | Imaging[] | Prescription[] | Reexam[];

function month(date: string) {
  return date?.slice(0, 7) || 'Không rõ ngày';
}
function monthLabel(value: string) {
  return /^\d{4}-\d{2}$/.test(value) ? `Tháng ${value.slice(5)}/${value.slice(0, 4)}` : value;
}
function valueDate(date: string) {
  return date ? formatDate(date) : '—';
}
export function abnormalArrow(result: string, reference: string): string {
  const value = Number(result.replace(',', '.'));
  const numbers = reference.match(/-?\d+(?:[.,]\d+)?/g)?.map((v) => Number(v.replace(',', '.'))) ?? [];
  if (Number.isNaN(value) || numbers.length < 2) return '!';
  if (value < numbers[0]!) return '↓';
  if (value > numbers[1]!) return '↑';
  return '!';
}

export function RecordRows({
  tab,
  rows,
  code,
  onDetail,
  selectedId,
  search = '',
}: {
  tab: RecordTab;
  rows: Rows;
  code: string;
  onDetail: (id: string) => void;
  selectedId?: string;
  search?: string;
}) {
  const query = search.trim().toLocaleLowerCase('vi');
  const filtered = rows.filter(
    (row) =>
      !query ||
      Object.values(row).some(
        (value) => typeof value === 'string' && value.toLocaleLowerCase('vi').includes(query),
      ),
  );
  const groups = new Map<string, typeof filtered>();
  for (const row of filtered) {
    const key = month(row.date);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  if (!filtered.length)
    return <p className="text-slate-gray px-4 py-8 text-sm">Không tìm thấy mục phù hợp.</p>;
  return (
    <div className="min-w-0">
      {[...groups].map(([key, items]) => (
        <section key={key}>
          <h3 className="bg-pebble text-slate-gray border-hairline sticky top-0 z-10 border-y px-4 py-2 text-sm font-semibold">
            {monthLabel(key)}
          </h3>
          {items.map((row, index) => {
            if (tab === 'reexams') {
              const r = row as Reexam;
              return (
                <div
                  key={`${r.date}-${index}`}
                  className="border-hairline odd:bg-pebble/40 flex min-h-16 items-center justify-between gap-2 border-b px-4 py-2"
                >
                  <span className="min-w-0 text-sm">
                    <b>{valueDate(r.date)}</b>
                    <span className="text-slate-gray block truncate">
                      Khoa: {r.specialtyCode || 'Theo phiếu hẹn'}
                    </span>
                  </span>
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/dat-kham?co-so=${encodeURIComponent(code)}&chuyen-khoa=${encodeURIComponent(r.specialtyCode)}`}
                    >
                      Đặt khám tái khám
                    </Link>
                  </Button>
                </div>
              );
            }
            const id = (row as Encounter).id ?? (row as Test).encounterId;
            const canOpen = Boolean(id);
            let title = '',
              secondary = '',
              trailing = '';
            if (tab === 'encounters') {
              const r = row as Encounter;
              title = r.room || 'Lần khám';
              secondary = [r.doctor, r.diagnosis].filter(Boolean).join(' · ');
            }
            if (tab === 'tests') {
              const r = row as Test;
              title = r.name;
              secondary = `${r.result} ${r.unit}${r.reference ? ` · Tham chiếu ${r.reference}` : ''}`;
              trailing = r.abnormal ? abnormalArrow(r.result, r.reference) : '';
            }
            if (tab === 'imaging') {
              const r = row as Imaging;
              title = r.name || 'Chẩn đoán hình ảnh';
              secondary = r.conclusion || r.description;
            }
            if (tab === 'prescriptions') {
              const r = row as Prescription;
              title = r.name;
              secondary = `${r.quantity} ${r.form} · ${r.dosage}`;
            }
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                disabled={!canOpen}
                onClick={() => onDetail(id)}
                aria-current={id === selectedId ? 'true' : undefined}
                className={`border-hairline hover:bg-info-bg focus-visible:ring-signal-blue odd:bg-pebble/40 flex min-h-16 w-full items-center gap-3 border-b px-3 py-2 text-left focus-visible:ring-2 focus-visible:ring-offset-2 ${id === selectedId ? 'bg-info-bg border-l-signal-blue border-l-[3px]' : ''}`}
              >
                <span className="w-14 shrink-0 text-center tabular-nums">
                  <b className="block text-base">
                    {row.date?.slice(8, 10)}/{row.date?.slice(5, 7)}
                  </b>
                  <small className="text-slate-gray">{row.date?.slice(0, 4)}</small>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="text-ink-navy block truncate font-semibold" title={title}>
                    {title}
                  </span>
                  <span
                    className={`block truncate text-sm ${tab === 'tests' && (row as Test).abnormal ? 'text-danger font-semibold' : 'text-slate-gray'}`}
                    title={secondary}
                  >
                    {secondary}
                  </span>
                </span>
                {trailing && (
                  <span className="text-danger font-bold" aria-label="Bất thường">
                    {trailing}
                  </span>
                )}
                {canOpen && <ChevronRight className="text-slate-gray size-4 shrink-0" aria-hidden />}
              </button>
            );
          })}
        </section>
      ))}
    </div>
  );
}
