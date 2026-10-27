import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FacilityCard } from '@/components/features/facility/FacilityCard';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const revalidate = 300;

const TYPES: Record<string, { code: string; label: string }> = {
  'benh-vien-cong': { code: 'BV_CONG', label: 'Bệnh viện công' },
  'benh-vien-tu': { code: 'BV_TU', label: 'Bệnh viện tư' },
  'phong-kham': { code: 'PHONG_KHAM', label: 'Phòng khám' },
};

export function generateStaticParams() {
  return Object.keys(TYPES).map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  return { title: `${TYPES[type]?.label ?? 'Cơ sở y tế'} – MQ Solutions` };
}

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const category = TYPES[type];
  if (!category) notFound();
  const facilities = (await getFacilityPublicService().listFacilities()).filter(
    (item) => item.type === category.code,
  );
  return (
    <div className="container-page py-10 md:py-16">
      <h1 className="text-ink-navy text-[32px] font-bold md:text-[50px]">{category.label}</h1>
      <p className="text-slate-gray mt-3">Khám phá {facilities.length} cơ sở và chọn lịch khám phù hợp.</p>
      {facilities.length ? (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((facility) => (
            <FacilityCard key={facility.code} facility={facility} />
          ))}
        </div>
      ) : (
        <p className="mt-8">Chưa có cơ sở trong danh mục này.</p>
      )}
    </div>
  );
}
