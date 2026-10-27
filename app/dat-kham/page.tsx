import type { Metadata } from 'next';
import { BookingWizard } from '@/components/features/booking/booking-wizard';
import { getCatalogService } from '@/lib/services/catalog';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const metadata: Metadata = { title: 'Đặt khám', robots: { index: false } };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ 'co-so'?: string }> }) {
  const [facilities, publicFacilities, params] = await Promise.all([
    getCatalogService().listFacilities(),
    getFacilityPublicService().listFacilities(),
    searchParams,
  ]);
  const facilityLogos = Object.fromEntries(
    publicFacilities.map((facility) => [facility.code, facility.logoUrl]),
  );
  return (
    <BookingWizard facilities={facilities} facilityLogos={facilityLogos} initialCode={params['co-so']} />
  );
}
