import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HomeFacility } from './types';

/** Lối vào đặt khám ngay trên khối đầu trang: chọn bệnh viện → sang bước chọn giờ. */
export function BookingWidget({
  facilities,
  loadError = false,
}: {
  facilities: HomeFacility[];
  loadError?: boolean;
}) {
  if (loadError) {
    return (
      <p role="alert" className="bg-danger-bg text-danger rounded-lg px-4 py-3 text-sm">
        Chưa tải được danh sách bệnh viện. Tải lại trang sau ít phút, hoặc gọi tổng đài để được đặt giúp.
      </p>
    );
  }
  if (!facilities.length) {
    return (
      <p className="bg-pebble text-slate-gray rounded-lg px-4 py-3 text-sm">
        Hiện chưa có bệnh viện nhận đặt khám trực tuyến.{' '}
        <Link href="/co-so-y-te" className="text-ink-navy font-semibold underline underline-offset-4">
          Xem danh sách cơ sở
        </Link>
      </p>
    );
  }
  return (
    <form
      action="/dat-kham"
      method="get"
      className="border-hairline bg-card w-full max-w-xl rounded-xl border p-4 shadow-md sm:p-5"
    >
      <label htmlFor="home-facility" className="text-ink-navy mb-2 block text-[15px] font-semibold">
        Bạn muốn khám ở bệnh viện nào?
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <select
            id="home-facility"
            name="co-so"
            required
            defaultValue=""
            className="border-hairline bg-pebble text-ink-navy focus-visible:border-primary h-12 w-full appearance-none rounded-md border pr-10 pl-3 text-[16px] font-medium"
          >
            <option value="" disabled>
              Chọn bệnh viện
            </option>
            {facilities.map((facility) => (
              <option key={facility.code} value={facility.code}>
                {facility.name}
              </option>
            ))}
          </select>
          <ChevronDown
            className="text-slate-gray pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2"
            aria-hidden
          />
        </div>
        <Button type="submit" size="lg" className="w-full rounded-md sm:w-auto">
          Xem lịch khám
        </Button>
      </div>
    </form>
  );
}
