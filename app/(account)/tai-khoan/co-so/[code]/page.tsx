import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { RecordsPanel } from '@/components/features/records/records-panel';
import { getActiveFacilityByCode, listActiveFacilities } from '@/lib/services/facility-service';
import { getIdentityService } from '@/lib/services/identity';
import { requirePageSession } from '@/app/_lib/session';

export const metadata: Metadata = { title: 'Hồ sơ khám bệnh', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

// W08/C04: chỉ đưa trạng thái định danh và MaBN đã che sang Client Component.
export default async function RecordsPage({ params }: { params: Promise<{ code: string }> }) {
  const session = await requirePageSession();
  if (session.mustChangePassword) redirect('/tai-khoan/doi-mat-khau');
  const { code } = await params;
  if (
    !z
      .string()
      .regex(/^[A-Za-z0-9_-]{2,20}$/)
      .safeParse(code).success
  )
    notFound();
  const facility = await getActiveFacilityByCode(code);
  if (!facility) notFound();
  const [identity, directory] = await Promise.all([
    getIdentityService().identify(session.id, facility.code),
    listActiveFacilities({ take: 100 }),
  ]);
  return (
    <RecordsPanel
      code={facility.code}
      name={facility.name}
      logoUrl={directory.find((f) => f.code === facility.code)?.logoUrl}
      identity={identity}
    />
  );
}
