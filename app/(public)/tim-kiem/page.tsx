import type { Metadata } from 'next';
import { ArrowLeft, ArrowRight, CircleAlert, CircleHelp, SearchX } from 'lucide-react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { SearchBox } from '@/components/features/search/search-box';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/form-field';
import { SITE } from '@/lib/config/site';
import { AppError } from '@/lib/domain/errors';
import { searchQuerySchema } from '@/lib/domain/search/query';
import type { SearchGroup, SearchPage, SearchType } from '@/lib/domain/search/types';
import { hashIp } from '@/lib/services/auth';
import { getSearchService } from '@/lib/services/search';

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

function Results({ result }: { result: SearchPage }) {
  if (result.total === 0) {
    return (
      <Card className="text-center">
        <SearchX className="text-muted-foreground mx-auto mb-3 size-8" aria-hidden="true" />
        <h2 className="text-xl font-semibold">Chưa tìm thấy kết quả phù hợp</h2>
        <p className="text-muted-foreground mt-2">
          Thử từ khóa “Nhi”, “Nội tiết” hoặc tên cơ sở. Cần hỗ trợ? Gọi{' '}
          <a className="font-semibold underline" href={`tel:${SITE.hotline.replace(/\s/g, '')}`}>
            {SITE.hotline}
          </a>
          .
        </p>
      </Card>
    );
  }

  if (Object.values(result.groups).every((items) => items.length === 0)) {
    return (
      <Card className="text-center">
        <SearchX className="text-muted-foreground mx-auto mb-3 size-8" aria-hidden="true" />
        <p>Trang này không còn kết quả. Vui lòng quay lại trang trước.</p>
        <Link
          className="text-primary mt-3 inline-block font-semibold underline"
          href={pageHref(result.query, result.type, Math.max(1, result.page - 1))}
        >
          Trang trước
        </Link>
      </Card>
    );
  }

  return (
    <>
      <p className="text-body-sm text-muted-foreground mb-6">
        Tìm thấy {result.total} kết quả cho “{result.query}”
      </p>
      <div className="space-y-8">
        {GROUPS.map(
          ({ type, title }) =>
            result.groups[type].length > 0 && (
              <section key={type} aria-labelledby={`group-${type}`}>
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <h2 id={`group-${type}`} className="text-foreground text-xl font-semibold">
                    {title}{' '}
                    <span className="text-muted-foreground text-base font-normal">
                      ({result.totals[type]})
                    </span>
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
                <ul className="grid gap-3 md:grid-cols-2">
                  {result.groups[type].map((item) => (
                    <li key={`${type}:${item.href}:${item.title}`}>
                      <Card className="h-full p-4 transition-shadow hover:shadow-md md:p-6">
                        <Link
                          href={item.href}
                          className="text-foreground hover:text-primary focus-visible:outline-primary text-lg font-semibold focus-visible:outline-2"
                        >
                          {item.title}
                        </Link>
                        {item.context && (
                          <p className="text-body-sm text-muted-foreground mt-2">{item.context}</p>
                        )}
                        {item.description && item.description !== item.context && (
                          <p className="text-body-sm text-muted-foreground mt-2 line-clamp-2">
                            {item.description}
                          </p>
                        )}
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

  return (
    <div className="container-page py-8 md:py-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-primary text-body-sm mb-2 font-semibold">TRA CỨU MQ SOLUTIONS</p>
        <h1 className="text-foreground mb-3 text-[32px] leading-tight font-bold md:text-[50px]">
          Tìm điều bạn cần
        </h1>
        <p className="text-muted-foreground mb-6">
          Cơ sở y tế, chuyên khoa, bác sĩ và thông tin chăm sóc sức khỏe trong một nơi.
        </p>
        <SearchBox initialQuery={q.slice(0, 80)} />
      </header>

      {q && (
        <nav
          aria-label="Lọc theo loại kết quả"
          className="border-border mb-8 flex gap-2 overflow-x-auto border-b pb-3"
        >
          {TABS.map(({ type, title }) => (
            <Link
              key={type}
              href={pageHref(q, type)}
              aria-current={(parsed?.success ? parsed.data.type : 'all') === type ? 'page' : undefined}
              className={`text-body-sm shrink-0 rounded-full px-4 py-2 font-semibold ${(parsed?.success ? parsed.data.type : 'all') === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-accent'}`}
            >
              {title}
            </Link>
          ))}
        </nav>
      )}

      {!q && (
        <Card className="max-w-3xl p-6">
          <CircleHelp className="text-primary mb-3 size-6" aria-hidden="true" />
          <h2 className="text-lg font-semibold">Bạn đang tìm gì?</h2>
          <p className="text-muted-foreground mt-2">
            Nhập ít nhất 2 ký tự để tìm theo tên cơ sở, địa chỉ, chuyên khoa, bác sĩ hoặc tiêu đề bài viết.
          </p>
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
      {result && <Results result={result} />}
    </div>
  );
}
