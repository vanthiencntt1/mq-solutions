import type { Metadata } from 'next';
import { z } from 'zod';
import { requirePageSession } from '@/app/_lib/session';
import { PatientStep } from '@/components/features/booking/patient/PatientStep';
import { getBookingService } from '@/lib/services/booking';

export const metadata: Metadata = { title: 'Hồ sơ bệnh nhân', robots: { index: false } };

export default async function PatientPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  const session = await requirePageSession();
  const params = await searchParams;
  const draftId = z.uuid().parse(params.draft);
  const data = await getBookingService().prepare(session.id, draftId);
  return <PatientStep data={data} />;
}
