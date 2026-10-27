import type { Metadata } from 'next';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, CircleAlert, FileText, Search, SearchX, UserRound } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { SearchBox } from '@/components/features/search/search-box';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { SpecialtyIcon } from '@/components/features/specialty/specialty-icon';
import { Alert } from '@/components/ui/form-field';
import { SITE } from '@/lib/config/site';
import { AppError } from '@/lib/domain/errors';
import { searchQuerySchema } from '@/lib/domain/search/query';
import type { SearchGroup, SearchPage, SearchType } from '@/lib/domain/search/types';
import { hashIp } from '@/lib/services/auth';
import { getSearchService } from '@/lib/services/search';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const metadata: Metadata = { title: 'Tìm kiếm' };
export const dynamic = 'force-dynamic';

const TABS: { type: SearchType; title: string }[] = [
  { type: 'all', title: 'Tất cả' },
  { type: 'facilities', title: 'Cơ sở' },
  { type: 'specialties', title: 'Chuyên khoa' },
  { type: 'doctors', title: 'Bác sĩ' },
  { type: 'posts', title: 'Tin tức' },
];
const GROUPS: { type: SearchGroup; title: string }[] = [
  { type: 'facilities', title: 'Cơ sở' },
  { type: 'specialties', title: 'Chuyên khoa' },
  { type: 'doctors', title: 'Bác sĩ' },
  { type: 'posts', title: 'Tin tức & hướng dẫn' },
];

function pageHref(q: string, type: SearchType, page = 1) {
  const params = new URLSearchParams({ q });
  if (type !== 'all') params.set('loai', type);
  if (page > 1) params.set('page', String(page));
  return `/tim-kiem?${params}`;
}

function Results({ result, logos }: { result: SearchPage; logos: Record<string, string> }) {
  if (result.total === 0) {
    return (
      <EmptyState
        icon={SearchX}
        title="Chưa tìm thấy kết quả phù hợp"
        description="Thử tên chuyên khoa, tên cơ sở hoặc từ khóa khác."
        action={
          <a className="text-primary font-semibold underline" href={`tel:${SITE.hotline.replace(/\s/g, '')}`}>
            Cần hỗ trợ? Gọi {SITE.hotline}
          </a>
        }
      />
    );
  }

  if (Object.values(result.groups).every((items) => items.length === 0)) {
    return (
      <EmptyState
        icon={SearchX}
        title="Trang này chưa có kết quả"
        description="Quay lại trang trước để xem các kết quả khác."
        action={
          <Link
            className="text-primary font-semibold underline"
            href={pageHref(result.query, result.type, Math.max(1, result.page - 1))}
          >
            Trang trước
          </Link>
        }
      />
    );
  }

  return (
    <>
      <p className="text-slate-gray mb-8">
        Tìm thấy {result.total} kết quả cho “{result.query}”
      </p>
      <div className="space-y-12">
        {GROUPS.map(
          ({ type, title }) =>
            result.groups[type].length > 0 && (
              <section key={type} aria-labelledby={`group-${type}`}>
                <div className="mb-5 flex items-baseline justify-between gap-3">
                  <h2 id={`group-${type}`} className="section-title">
                    {title}{' '}
                    <span className="text-slate-gray text-base font-normal">({result.totals[type]})</span>
                  </h2>
                  {result.type === 'all' && result.totals[type] > result.pageSize && (
                    <Link
                      className="text-primary text-body-sm font-semibold hover:underline"
                      href={pageHref(result.query, type)}
                    >
                      Xem thêm
                    </Link>
                  )}
                </div>
                <ul className="grid gap-4 md:grid-cols-2">
                  {result.groups[type].map((item) => (
                    <li key={`${type}:${item.href}:${item.title}`}>
                      <Card className="flex h-full min-w-0 items-start gap-4 p-5 transition-shadow hover:shadow-md md:p-6">
                        {type === 'facilities' && logos[item.href] ? (
                          <span className="border-hairline bg-paper relative size-12 shrink-0 overflow-hidden rounded-xl border">
                            <Image
                              src={logos[item.href]!}
                              alt=""
                              fill
                              unoptimized
                              className="object-contain p-1"
                            />
                          </span>
                        ) : type === 'specialties' ? (
                          <IconTile>
                            <SpecialtyIcon name={item.title} />
                          </IconTile>
                        ) : type === 'doctors' ? (
                          <IconTile>
                            <span className="text-lg font-bold" aria-hidden>
                              {item.title
                                .trim()
                                .split(/\s+/)
                                .slice(-2)
                                .map((word) => word.charAt(0))
                                .join('')
                                .toUpperCase()}
                            </span>
                          </IconTile>
                        ) : (
                          <IconTile>
                            {type === 'posts' ? <FileText aria-hidden /> : <Search aria-hidden />}
                          </IconTile>
                        )}
                        <div className="min-w-0">
                          <Link
                            href={item.href}
                            className="text-ink-navy hover:text-primary text-[22px] leading-snug font-bold"
                          >
                            {item.title}
                          </Link>
                          {item.context && <p className="text-slate-gray mt-2 text-sm">{item.context}</p>}
                          {item.description && item.description !== item.context && (
                            <p className="text-slate-gray mt-2 line-clamp-2 text-sm leading-6">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </Card>
                    </li>
                  ))}
                </ul>
              </section>
            ),
        )}
      </div>
      <nav aria-label="Phân trang kết quả" className="mt-8 flex items-center justify-between gap-4">
        {result.page > 1 ? (
          <Link
            className="text-foreground hover:text-primary inline-flex items-center gap-2 font-semibold"
            href={pageHref(result.query, result.type, result.page - 1)}
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Trang trước
          </Link>
        ) : (
          <span />
        )}
        {Object.values(result.totals).some((total) => total > result.page * result.pageSize) && (
          <Link
            className="text-foreground hover:text-primary inline-flex items-center gap-2 font-semibold"
            href={pageHref(result.query, result.type, result.page + 1)}
          >
            Trang sau <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </nav>
    </>
  );
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = typeof params.q === 'string' ? params.q.trim() : '';
  const parsed = q ? searchQuerySchema.safeParse({ q, type: params.loai, page: params.page }) : null;
  let result: SearchPage | null = null;
  let message = parsed && !parsed.success ? 'Từ khóa hoặc trang tìm kiếm chưa hợp lệ.' : '';
  if (parsed?.success) {
    const h = await headers();
    const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
    try {
      result = await getSearchService().search({ ...parsed.data, ipHash: hashIp(ip) });
    } catch (cause) {
      message =
        cause instanceof AppError ? cause.message : 'Chưa tải được kết quả. Vui lòng thử lại sau ít phút.';
    }
  }
  const logos: Record<string, string> = {};
  if (result?.groups.facilities.length) {
    const facilities = await getFacilityPublicService().listFacilities();
    for (const facility of facilities)
      if (facility.logoUrl) logos[`/co-so/${encodeURIComponent(facility.slug)}`] = facility.logoUrl;
  }

  return (
    <main className="container-page py-12 md:py-16">
      <header className="mb-10 max-w-4xl">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">Tra cứu MQ Solutions</p>
        <h1 className="text-display-responsive text-ink-navy mt-4 mb-4">Tìm điều bạn cần</h1>
        <p className="text-slate-gray mb-8 text-lg leading-8">
          Cơ sở y tế, chuyên khoa, bác sĩ và thông tin chăm sóc sức khỏe trong một nơi.
        </p>
        <SearchBox initialQuery={q.slice(0, 80)} prominent />
      </header>

      {q && (
        <nav
          aria-label="Lọc theo loại kết quả"
          className="border-hairline mb-10 flex gap-2 overflow-x-auto border-b pb-4"
        >
          {TABS.map(({ type, title }) => (
            <Link
              key={type}
              href={pageHref(q, type)}
              aria-current={(parsed?.success ? parsed.data.type : 'all') === type ? 'page' : undefined}
              className={`shrink-0 rounded-full px-4 py-3 text-sm font-semibold ${(parsed?.success ? parsed.data.type : 'all') === type ? 'bg-info-bg text-primary' : 'bg-pebble text-ink-navy hover:bg-info-bg'}`}
            >
              {title}
            </Link>
          ))}
        </nav>
      )}

      {!q && (
        <Card variant="panel" className="max-w-4xl">
          <div className="flex items-start gap-4">
            <IconTile>
              <UserRound aria-hidden />
            </IconTile>
            <div>
              <h2 className="text-ink-navy text-2xl font-bold">Bạn đang tìm gì?</h2>
              <p className="text-slate-gray mt-2 leading-7">
                Nhập ít nhất 2 ký tự để tìm tên cơ sở, địa chỉ, chuyên khoa, bác sĩ hoặc bài viết.
              </p>
            </div>
          </div>
        </Card>
      )}
      {message && (
        <Alert tone="danger">
          <span className="flex items-center gap-2">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {message}
          </span>
        </Alert>
      )}
      {result && <Results result={result} logos={logos} />}
    </main>
  );
}
