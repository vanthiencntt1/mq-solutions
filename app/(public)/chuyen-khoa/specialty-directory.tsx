'use client';

import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { SpecialtyIcon } from '@/components/features/specialty/specialty-icon';
import { EmptyState } from '@/components/ui/empty-state';

type Group = { slug: string; name: string; count: number };

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
}

export function SpecialtyDirectory({ groups }: { groups: Group[] }) {
  const [query, setQuery] = useState('');
  const filtered = useMemo(
    () => groups.filter((group) => normalize(group.name).includes(normalize(query.trim()))),
    [groups, query],
  );
  return (
    <section className="mt-12" aria-label="Danh sách chuyên khoa">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="section-title">Danh sách chuyên khoa</h2>
          {groups.length > 0 && (
            <p className="text-slate-gray mt-2">{groups.length} chuyên khoa đang nhận đặt khám</p>
          )}
        </div>
        <label className="relative block w-full md:max-w-sm">
          <span className="sr-only">Tìm nhanh chuyên khoa</span>
          <Search
            className="text-slate-gray pointer-events-none absolute top-3.5 left-4 size-5"
            strokeWidth={1.75}
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên chuyên khoa"
            className="border-hairline bg-paper text-ink-navy placeholder:text-slate-gray h-12 w-full rounded-lg border pr-4 pl-12 shadow-sm"
          />
        </label>
      </div>
      {filtered.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((group) => (
            <li key={group.slug}>
              <Link
                href={`/chuyen-khoa/${encodeURIComponent(group.slug)}`}
                className="border-hairline bg-paper group flex h-full min-h-28 items-center gap-4 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-3 md:p-5"
              >
                <span className="bg-pebble flex size-14 shrink-0 items-center justify-center rounded-2xl md:size-16">
                  <SpecialtyIcon name={group.name} size="lg" className="size-14 md:size-16" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-ink-navy text-[22px] leading-snug font-bold">{group.name}</span>
                  <span className="text-slate-gray mt-1 text-sm">{group.count} cơ sở y tế</span>
                  <span className="text-primary mt-2 inline-flex items-center gap-1 font-semibold">
                    Xem cơ sở <ArrowRight className="size-4" aria-hidden />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          className="mt-8"
          title={groups.length ? 'Không tìm thấy chuyên khoa' : 'Chưa có chuyên khoa'}
          description={
            groups.length ? 'Thử tìm bằng tên khác hoặc bỏ dấu tiếng Việt.' : 'Vui lòng quay lại sau.'
          }
        />
      )}
    </section>
  );
}
