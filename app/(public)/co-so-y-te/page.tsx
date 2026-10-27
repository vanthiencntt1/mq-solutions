import type { Metadata } from 'next';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { z } from 'zod';
import { FacilityCard } from '@/components/features/facility/FacilityCard';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { filterFacilities, getFacilityPublicService } from '@/lib/services/facility-public-service';

export const revalidate = 300;
export const metadata: Metadata = {
  title: 'Cơ sở y tế – Đặt lịch khám online | MQ Solutions',
  description: 'Tìm bệnh viện, phòng khám theo khu vực và đặt lịch khám trực tuyến.',
};

const TYPES = [
  ['BV_CONG', 'Bệnh viện công'],
  ['BV_TU', 'Bệnh viện tư'],
  ['PHONG_KHAM', 'Phòng khám'],
  ['PHONG_MACH', 'Phòng mạch'],
  ['XET_NGHIEM', 'Xét nghiệm'],
] as const;

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tinh?: string; loai?: string; trang?: string }>;
}) {
  // W03 mục 1: tham số URL có thể bị lặp hoặc chứa kiểu ngoài ý muốn.
  const parsed = z
    .object({
      q: z.string().max(100).optional(),
      tinh: z.string().max(100).optional(),
      loai: z.string().max(40).optional(),
      trang: z
        .string()
        .regex(/^\d{1,4}$/)
        .optional(),
    })
    .safeParse(await searchParams);
  const params = parsed.success
    ? parsed.data
    : { q: undefined, tinh: undefined, loai: undefined, trang: undefined };
  const all = await getFacilityPublicService().listFacilities();
  const provinces = [...new Set(all.map((facility) => facility.provinceName))].sort((a, b) =>
    a.localeCompare(b, 'vi'),
  );
  const filtered = filterFacilities(all, { q: params.q, province: params.tinh, type: params.loai });
  const requested = Number(params.trang ?? 1);
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const pages = Math.ceil(filtered.length / 12);
  const results = filtered.slice((page - 1) * 12, page * 12);
  const nextParams = new URLSearchParams();
  if (params.q) nextParams.set('q', params.q);
  if (params.tinh) nextParams.set('tinh', params.tinh);
  if (params.loai) nextParams.set('loai', params.loai);
  nextParams.set('trang', String(page + 1));

  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-3xl">
        <p className="text-info text-sm font-semibold">DANH BẠ CƠ SỞ Y TẾ</p>
        <h1 className="text-ink-navy mt-3 text-[32px] leading-tight font-bold md:text-[50px]">
          Tìm nơi khám phù hợp
        </h1>
        <p className="text-slate-gray mt-4 text-lg">
          Cơ sở y tế hàng đầu giúp trải nghiệm khám chữa bệnh tốt hơn. Lọc theo khu vực hoặc tên để bắt đầu.
        </p>
      </header>
      <form
        action="/co-so-y-te"
        method="get"
        className="border-border bg-card mt-10 grid gap-4 rounded-2xl border p-4 shadow-sm md:grid-cols-[2fr_1fr_1fr_auto] md:items-end md:p-6"
      >
        <div>
          <Label htmlFor="facility-q">Tên cơ sở</Label>
          <Input
            id="facility-q"
            name="q"
            defaultValue={params.q ?? ''}
            placeholder="Tìm bệnh viện, phòng khám..."
            className="mt-2"
          />
        </div>
        <div>
          <Label htmlFor="facility-province">Tỉnh / thành</Label>
          <select
            id="facility-province"
            name="tinh"
            defaultValue={params.tinh ?? ''}
            className="border-input bg-card mt-2 h-11 w-full rounded-md border px-3"
          >
            <option value="">Tất cả khu vực</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="facility-type">Loại cơ sở</Label>
          <select
            id="facility-type"
            name="loai"
            defaultValue={params.loai ?? ''}
            className="border-input bg-card mt-2 h-11 w-full rounded-md border px-3"
          >
            <option value="">Tất cả loại</option>
            {TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit">
          <Search aria-hidden /> Tìm cơ sở
        </Button>
      </form>
      <div className="mt-10 flex items-center justify-between gap-4">
        <p className="text-slate-gray">{filtered.length} cơ sở phù hợp</p>
        {(params.q || params.tinh || params.loai) && (
          <Link href="/co-so-y-te" className="text-info text-sm font-semibold hover:underline">
            Xóa bộ lọc
          </Link>
        )}
      </div>
      {results.length ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {results.map((facility) => (
            <FacilityCard key={facility.code} facility={facility} />
          ))}
        </div>
      ) : (
        <div className="border-border bg-card mt-5 rounded-xl border p-10 text-center">
          <p className="text-ink-navy font-semibold">Chưa tìm thấy cơ sở phù hợp.</p>
          <p className="text-slate-gray mt-2">Hãy thử tên hoặc khu vực khác.</p>
        </div>
      )}
      {pages > 1 && (
        <nav aria-label="Phân trang cơ sở" className="mt-8 flex items-center justify-center gap-4">
          <span className="text-slate-gray text-sm">
            Trang {page} / {pages}
          </span>
          {page < pages && (
            <Button asChild variant="outline">
              <Link href={`/co-so-y-te?${nextParams}`}>Xem thêm</Link>
            </Button>
          )}
        </nav>
      )}
    </div>
  );
}
