'use client';

import Link from 'next/link';
import { CircleAlert, LoaderCircle, Search, SearchX } from 'lucide-react';
import { useEffect, useId, useState } from 'react';
import { ApiError, apiFetch } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { SearchGroup, SearchPage } from '@/lib/domain/search/types';

const GROUPS: { type: SearchGroup; title: string }[] = [
  { type: 'facilities', title: 'Cơ sở' },
  { type: 'specialties', title: 'Chuyên khoa' },
  { type: 'doctors', title: 'Bác sĩ' },
  { type: 'posts', title: 'Tin tức' },
];

/** W05 mục 2: ô dùng được ở trang này và header; chỉ tải gợi ý khi người dùng nhập. */
export function SearchBox({
  initialQuery = '',
  prominent = false,
}: {
  initialQuery?: string;
  prominent?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<SearchPage | null>(null);
  const [focused, setFocused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const listId = useId();

  useEffect(() => {
    const term = query.trim();
    if (!focused || term.length < 2) return;
    let live = true;
    const timer = window.setTimeout(async () => {
      setBusy(true);
      setError('');
      try {
        const result = await apiFetch<SearchPage>(`/api/search/suggest?q=${encodeURIComponent(term)}`);
        if (live) setSuggestions(result);
      } catch (cause) {
        if (live) {
          setSuggestions(null);
          setError(cause instanceof ApiError ? cause.message : 'Chưa tải được gợi ý');
        }
      } finally {
        if (live) setBusy(false);
      }
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [focused, query]);

  const show = focused && query.trim().length >= 2;
  return (
    <div className="relative w-full">
      <form action="/tim-kiem" method="get" role="search" className="flex gap-2">
        <label htmlFor="mq-search-input" className="sr-only">
          Tìm cơ sở, chuyên khoa, bác sĩ hoặc tin tức
        </label>
        <Input
          id="mq-search-input"
          name="q"
          type="search"
          autoComplete="off"
          minLength={2}
          maxLength={80}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSuggestions(null);
          }}
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            if (!event.currentTarget.parentElement?.parentElement?.contains(event.relatedTarget))
              setFocused(false);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setFocused(false);
          }}
          aria-controls={show ? listId : undefined}
          aria-expanded={show && !!suggestions}
          placeholder="Ví dụ: Nội tiết, Nhi, tên cơ sở..."
          className={
            prominent
              ? 'border-hairline bg-paper h-14 min-w-0 rounded-lg border pl-4 text-lg shadow-sm'
              : 'bg-pebble h-12 min-w-0 pl-4'
          }
        />
        <Button type="submit" size={prominent ? 'lg' : 'md'} className="shrink-0" aria-label="Tìm kiếm">
          <Search aria-hidden="true" />
          <span className="hidden sm:inline">Tìm kiếm</span>
        </Button>
      </form>

      {show && (busy || error || suggestions) && (
        <div
          id={listId}
          className="border-hairline bg-paper absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-xl border p-3 shadow-md"
        >
          {busy && (
            <p className="text-body-sm text-muted-foreground flex items-center gap-2 p-2" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Đang tìm gợi ý...
            </p>
          )}
          {error && (
            <p className="text-body-sm text-danger flex items-center gap-2 p-2" role="alert">
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" /> {error}
            </p>
          )}
          {suggestions && !busy && suggestions.total === 0 && (
            <p className="text-body-sm text-muted-foreground flex items-center gap-2 p-2">
              <SearchX className="size-4 shrink-0" aria-hidden="true" /> Chưa có gợi ý phù hợp.
            </p>
          )}
          {suggestions &&
            !busy &&
            GROUPS.map(({ type, title }) =>
              suggestions.groups[type].length > 0 ? (
                <section key={type} className="mb-2 last:mb-0">
                  <h2 className="text-caption text-muted-foreground px-2 py-1 font-semibold uppercase">
                    {title}
                  </h2>
                  <ul>
                    {suggestions.groups[type].map((item) => (
                      <li key={`${type}:${item.href}:${item.title}`}>
                        <Link
                          href={item.href}
                          className="text-foreground hover:bg-muted focus-visible:bg-muted focus-visible:outline-primary block rounded-md px-2 py-2 focus-visible:outline-2"
                        >
                          <span className="block font-medium">{item.title}</span>
                          {item.context && (
                            <span className="text-caption text-muted-foreground">{item.context}</span>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null,
            )}
          {suggestions && !busy && suggestions.total > 0 && (
            <Link
              href={`/tim-kiem?q=${encodeURIComponent(query.trim())}`}
              className="text-primary border-border block border-t px-2 pt-3 font-semibold hover:underline"
            >
              Xem tất cả kết quả
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
