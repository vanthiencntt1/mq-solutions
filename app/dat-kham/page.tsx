import type { Metadata } from 'next';
import { BookingWizard } from '@/components/features/booking/booking-wizard';
import { getCatalogService } from '@/lib/services/catalog';

export const metadata: Metadata = { title: 'Đặt khám', robots: { index: false } };

export default async function BookingPage({ searchParams }: { searchParams: Promise<{ 'co-so'?: string }> }) {
  const [facilities, params] = await Promise.all([getCatalogService().listFacilities(), searchParams]);
  return <BookingWizard facilities={facilities} initialCode={params['co-so']} />;
}
