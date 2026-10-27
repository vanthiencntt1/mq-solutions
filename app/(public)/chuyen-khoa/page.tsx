import type { Metadata } from 'next';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';
import { SpecialtyDirectory } from './specialty-directory';

export const revalidate = 3600;
export const metadata: Metadata = {
  title: 'Chuyên khoa – Đặt lịch khám',
  description: 'Tìm chuyên khoa và cơ sở y tế có lịch khám phù hợp.',
};

export default async function Page() {
  const groups = await getFacilityPublicService().specialtyGroups();
  return (
    <main className="container-page py-12 md:py-16">
      <header className="max-w-3xl">
        <p className="text-primary text-sm font-semibold tracking-wide uppercase">Khám theo chuyên khoa</p>
        <h1 className="text-display-responsive text-ink-navy mt-4">Chọn chuyên khoa bạn cần</h1>
        <p className="text-slate-gray mt-5 text-lg leading-8">
          Tìm đúng chuyên khoa và xem các cơ sở y tế đang nhận đặt khám.
        </p>
      </header>
      <SpecialtyDirectory
        groups={groups.map(({ slug, name, facilities }) => ({ slug, name, count: facilities.length }))}
      />
    </main>
  );
}
