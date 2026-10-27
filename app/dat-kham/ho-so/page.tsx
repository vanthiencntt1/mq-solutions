import type { Metadata } from 'next';
import { z } from 'zod';
import { requirePageSession } from '@/app/_lib/session';
import { PatientStep } from '@/components/features/booking/patient/PatientStep';
import { getBookingService } from '@/lib/services/booking';
import { getFacilityPublicService } from '@/lib/services/facility-public-service';

export const metadata: Metadata = { title: 'Hồ sơ bệnh nhân', robots: { index: false } };

export default async function PatientPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const session = await requirePageSession();
  const params = await searchParams;
  const draftId = z.uuid().parse(params.draft);
  const [data, facilities] = await Promise.all([
    getBookingService().prepare(session.id, draftId),
    getFacilityPublicService().listFacilities(),
  ]);
  return (
    <PatientStep
      data={data}
      facilityLogoUrl={facilities.find((facility) => facility.code === data.draft.facilityCode)?.logoUrl}
    />
  );
}
