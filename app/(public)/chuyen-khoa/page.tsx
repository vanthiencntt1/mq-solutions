import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Stethoscope } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Chuyên khoa – Đặt lịch khám | MQ Solutions',
  description: 'Tìm chuyên khoa và cơ sở y tế có lịch khám phù hợp.',
};

export default async function Page() {
  const groups = await getFacilityPublicService().specialtyGroups();
  return (
    <div className="container-page py-10 md:py-16">
      <header className="max-w-3xl">
        <p className="text-info text-sm font-semibold">KHÁM THEO CHUYÊN KHOA</p>
        <h1 className="text-ink-navy mt-3 text-[32px] font-bold md:text-[50px]">Chọn chuyên khoa bạn cần</h1>
        <p className="text-slate-gray mt-4 text-lg">
          Khám phá các chuyên khoa từ những cơ sở y tế đang nhận đặt lịch.
        </p>
      </header>
      {groups.length ? (
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Card key={group.slug} className="flex h-full flex-col">
              <div className="bg-info-bg text-info flex size-12 items-center justify-center rounded-xl">
                <Stethoscope aria-hidden />
              </div>
              <h2 className="text-ink-navy mt-5 text-xl font-semibold">{group.name}</h2>
              <p className="text-slate-gray mt-2 text-sm">{group.facilities.length} cơ sở có chuyên khoa</p>
              <Link
                href={`/chuyen-khoa/${encodeURIComponent(group.slug)}`}
                className="text-info mt-auto inline-flex items-center gap-2 pt-6 font-semibold hover:underline"
              >
                Xem cơ sở <ArrowRight className="size-4" aria-hidden />
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <div className="border-border bg-card mt-10 rounded-xl border p-8">
          <p className="text-ink-navy font-semibold">Danh mục chuyên khoa đang cập nhật.</p>
          <p className="text-slate-gray mt-2">Vui lòng quay lại sau.</p>
        </div>
      )}
    </div>
  );
}
