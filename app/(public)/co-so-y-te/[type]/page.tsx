import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FacilityCard } from '@/components/features/facility/FacilityCard';
import { SectionHeader } from '@/components/ui/section-header';
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
  const service = getFacilityPublicService();
  const facilities = (await service.listFacilities()).filter((item) => item.type === category.code);
  const counts = await service.facilityCounts(facilities);
  return (
    <div className="container-page py-10 md:py-16">
      <h1 className="text-ink-navy md:text-heading-lg text-[42px] font-bold">{category.label}</h1>
      <div className="mt-12">
        <SectionHeader
          align="left"
          title="Danh sách cơ sở"
          description={`${facilities.length} cơ sở để bạn tìm hiểu và đặt khám.`}
        />
      </div>
      {facilities.length ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {facilities.map((facility) => (
            <FacilityCard key={facility.code} facility={facility} counts={counts[facility.code]} />
          ))}
        </div>
      ) : (
        <p className="mt-8">Chưa có cơ sở trong danh mục này.</p>
      )}
    </div>
  );
}
