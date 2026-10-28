import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { requirePageSession } from '@/app/_lib/session';
import { ImagingReport } from '@/components/features/records/reports/imaging-report';
import { LabReport } from '@/components/features/records/reports/lab-report';
import { PrescriptionReport } from '@/components/features/records/reports/prescription-report';
import { PrintToolbar } from '@/components/features/records/reports/print-toolbar';
import { getMedicalReport } from '@/lib/services/records/report-service';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Xem phiếu hồ sơ', robots: { index: false, follow: false } };
const Params = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{2,20}$/),
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
});
const Query = z.object({ loai: z.enum(['lab', 'imaging', 'prescription']) });

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string; id: string }>;
  searchParams: Promise<{ loai?: string }>;
}) {
  const session = await requirePageSession();
  if (session.mustChangePassword) redirect('/tai-khoan/doi-mat-khau');
  const parsed = Params.safeParse(await params);
  const query = Query.safeParse(await searchParams);
  if (!parsed.success || !query.success) notFound();
  const { code, id } = parsed.data;
  const report = await getMedicalReport(session.id, code, id, query.data.loai);
  return (
    <div className="report-print-page -mx-4 -my-4 min-h-screen px-4 pb-8 md:-mx-6 xl:-mx-8">
      <PrintToolbar back={`/tai-khoan/co-so/${code}?lan-kham=${id}`} />
      {report.type === 'lab' ? (
        <LabReport report={report} />
      ) : report.type === 'imaging' ? (
        <ImagingReport report={report} />
      ) : (
        <PrescriptionReport report={report} />
      )}
    </div>
  );
}
