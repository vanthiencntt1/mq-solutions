'use client';

import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { EncounterDetail } from '@/lib/domain/records/types';
import { formatDate } from '@/lib/utils/format';
import { abnormalArrow } from './record-rows';

type Section = 'lab' | 'imaging' | 'prescription';
export function RecordDetailPane({
  detail,
  code,
  onBack,
}: {
  detail: EncounterDetail;
  code: string;
  onBack: () => void;
}) {
  const [section, setSection] = useState<Section>('lab');
  const printUrl = `/tai-khoan/co-so/${encodeURIComponent(code)}/phieu/${encodeURIComponent(detail.id)}?loai=${section}`;
  const counts = {
    lab: detail.tests.length,
    imaging: detail.imaging.length,
    prescription: detail.prescriptions.length,
  };
  return (
    <div className="min-w-0 space-y-5 p-4 lg:p-6">
      <button
        onClick={onBack}
        className="text-deep-cobalt focus-visible:ring-signal-blue flex min-h-11 items-center gap-2 font-semibold focus-visible:ring-2 lg:hidden"
      >
        <ArrowLeft className="size-4" /> Danh sách
      </button>
      <div>
        <p className="text-slate-gray text-sm tabular-nums">
          {formatDate(detail.date)} · {detail.room}
        </p>
        <h2 className="text-ink-navy text-2xl font-bold lg:text-[28px]">
          {detail.room || 'Chi tiết lần khám'}
        </h2>
        <p className="text-slate-gray mt-1 text-sm">Bác sĩ: {detail.doctor || 'Chưa có thông tin'}</p>
        <p className="mt-1">
          Chẩn đoán: <b>{detail.diagnosis || 'Chưa có thông tin'}</b>
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="tablist" aria-label="Loại phiếu" className="flex flex-wrap gap-1">
          {(
            [
              ['lab', 'Xét nghiệm'],
              ['imaging', 'CĐHA'],
              ['prescription', 'Đơn thuốc'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={section === key}
              onClick={() => setSection(key)}
              className={`focus-visible:ring-signal-blue min-h-11 rounded-lg px-3 text-sm font-semibold focus-visible:ring-2 ${section === key ? 'bg-info-bg text-deep-cobalt' : 'text-slate-gray hover:bg-pebble'}`}
            >
              {label} {counts[key]}
            </button>
          ))}
        </div>
        {counts[section] > 0 && (
          <Button asChild size="sm" variant="outline">
            <Link href={printUrl} target="_blank">
              Xem phiếu <ExternalLink className="!size-4" />
            </Link>
          </Button>
        )}
      </div>
      <div className="border-hairline bg-paper min-w-0 rounded-sm border tabular-nums">
        {section === 'lab' &&
          (detail.tests.length ? (
            <div>
              <div className="bg-pebble border-hairline hidden grid-cols-[40px_minmax(0,2fr)_1fr_1fr_1fr] gap-2 border-b px-3 py-2 text-xs font-bold sm:grid">
                <span>STT</span>
                <span>TÊN XÉT NGHIỆM</span>
                <span>KẾT QUẢ</span>
                <span>ĐƠN VỊ</span>
                <span>THAM CHIẾU</span>
              </div>
              {detail.tests.map((r, i) => (
                <Fragment key={i}>
                  {r.group && (i === 0 || detail.tests[i - 1]?.group !== r.group) && (
                    <h4 className="bg-pebble border-hairline border-b px-3 py-2 text-sm font-bold">
                      {r.group}
                    </h4>
                  )}
                  <div className="border-hairline grid gap-1 border-b px-3 py-2 text-sm sm:min-h-10 sm:grid-cols-[40px_minmax(0,2fr)_1fr_1fr_1fr] sm:items-center sm:gap-2">
                    <span className="text-slate-gray hidden sm:block">{i + 1}</span>
                    <b className="min-w-0">{r.name}</b>
                    <span className={r.abnormal ? 'text-danger font-bold' : ''}>
                      {r.abnormal ? `${abnormalArrow(r.result, r.reference)} ` : ''}
                      {r.result}
                    </span>
                    <span className="text-slate-gray text-xs sm:text-sm">{r.unit}</span>
                    <span className="text-slate-gray text-xs sm:text-sm">{r.reference}</span>
                    {r.fileUrl && (
                      <a
                        className="text-deep-cobalt text-xs underline sm:col-span-5"
                        href={r.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Tệp kết quả gốc
                      </a>
                    )}
                  </div>
                </Fragment>
              ))}
            </div>
          ) : (
            <p className="text-slate-gray p-6">Lần khám này không có xét nghiệm.</p>
          ))}
        {section === 'imaging' &&
          (detail.imaging.length ? (
            detail.imaging.map((r, i) => (
              <article key={i} className="border-hairline space-y-2 border-b p-4">
                <h3 className="text-lg font-semibold">{r.name || 'Chẩn đoán hình ảnh'}</h3>
                <p className="leading-relaxed">{r.description || 'Chưa có mô tả'}</p>
                <p className="bg-pebble border-l-ink-navy border-l-[3px] p-3 font-semibold">
                  Kết luận: {r.conclusion || 'Chưa có'}
                </p>
                {r.fileUrl && (
                  <a
                    className="text-deep-cobalt inline-flex min-h-11 items-center text-sm underline"
                    href={r.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Tệp kết quả gốc
                  </a>
                )}
              </article>
            ))
          ) : (
            <p className="text-slate-gray p-6">Lần khám này không có chẩn đoán hình ảnh.</p>
          ))}
        {section === 'prescription' &&
          (detail.prescriptions.length ? (
            detail.prescriptions.map((r, i) => (
              <div
                key={i}
                className="border-hairline grid grid-cols-[32px_minmax(0,1fr)_auto] gap-2 border-b px-3 py-3 text-sm"
              >
                <span className="text-slate-gray text-right">{i + 1}</span>
                <span>
                  <b className="block">{r.name}</b>
                  {r.activeIngredient && <i className="text-slate-gray block">{r.activeIngredient}</i>}
                  <span className="text-slate-gray block">Cách dùng: {r.dosage || 'Chưa có hướng dẫn'}</span>
                  {[r.morning, r.noon, r.afternoon, r.evening].some((v) => v !== undefined) && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {(
                        [
                          ['Sáng', r.morning],
                          ['Trưa', r.noon],
                          ['Chiều', r.afternoon],
                          ['Tối', r.evening],
                        ] as const
                      ).map(([label, value]) => (
                        <span
                          key={label}
                          className={`bg-pebble inline-flex min-w-10 flex-col items-center rounded-sm px-1 py-0.5 text-xs tabular-nums ${value === '0' ? 'text-slate-gray' : ''}`}
                        >
                          <small>{label}</small>
                          {value ?? '—'}
                        </span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="font-semibold">
                  {r.quantity} {r.form}
                </span>
              </div>
            ))
          ) : (
            <p className="text-slate-gray p-6">Lần khám này không có đơn thuốc.</p>
          ))}
      </div>
    </div>
  );
}
