import Link from 'next/link';
import { ArrowRight, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HomeFacility } from './types';

export function BookingWidget({
  facilities,
  loadError = false,
}: {
  facilities: HomeFacility[];
  loadError?: boolean;
}) {
  return (
    <div className="border-border bg-card relative rounded-2xl border p-5 shadow-lg sm:p-8">
      <div className="bg-info-bg text-info mb-6 inline-flex size-11 items-center justify-center rounded-xl">
        <Building2 className="size-6" aria-hidden />
      </div>
      <h2 className="text-ink-navy text-[24px] leading-snug font-semibold">Bắt đầu từ cơ sở bạn muốn khám</h2>
      <p className="text-slate-gray mt-2 text-sm">
        Chọn bệnh viện hoặc phòng khám để xem chuyên khoa và lịch còn trống.
      </p>
      {loadError ? (
        <div role="alert" className="bg-danger-bg text-danger mt-6 rounded-lg p-4 text-sm">
          Không thể tải danh sách cơ sở lúc này. Vui lòng thử lại sau ít phút.
        </div>
      ) : facilities.length ? (
        <form action="/dat-kham" method="get" className="mt-6 space-y-4">
          <label htmlFor="home-facility" className="text-ink-navy block text-sm font-semibold">
            Cơ sở y tế
          </label>
          <div className="relative">
            <MapPin
              className="text-slate-gray pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2"
              aria-hidden
            />
            <select
              id="home-facility"
              name="co-so"
              required
              defaultValue=""
              className="border-input bg-pebble text-ink-navy focus-visible:border-primary h-12 w-full appearance-none rounded-md border pr-3 pl-10"
            >
              <option value="" disabled>
                Chọn cơ sở y tế
              </option>
              {facilities.map((facility) => (
                <option key={facility.code} value={facility.code}>
                  {facility.name} · {facility.provinceName}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">
            Xem lịch khám <ArrowRight aria-hidden />
          </Button>
        </form>
      ) : (
        <div className="bg-muted mt-6 rounded-lg p-4 text-sm">
          <p className="text-slate-gray">Hiện chưa có cơ sở nhận đặt khám trực tuyến.</p>
          <Link href="/co-so-y-te" className="text-ink-navy mt-2 inline-block font-semibold underline">
            Xem danh sách cơ sở
          </Link>
        </div>
      )}
      <p className="text-slate-gray mt-5 text-xs">
        Không cần chọn ngày ngay. Bạn sẽ xem thông tin trước khi xác nhận.
      </p>
    </div>
  );
}
