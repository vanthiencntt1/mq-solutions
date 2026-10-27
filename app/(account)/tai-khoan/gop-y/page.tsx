import type { Metadata } from 'next';
import { requirePageSession } from '@/app/_lib/session';
import { FeedbackPanel } from '@/components/features/feedback/feedback-panel';
import { feedbackListSchema } from '@/lib/domain/feedback/schemas';
import { getFeedbackService } from '@/lib/services/feedback';

export const metadata: Metadata = { title: 'Góp ý', robots: { index: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const session = await requirePageSession();
  const query = feedbackListSchema.parse(await searchParams);
  const service = getFeedbackService();
  const [result, appointments] = await Promise.all([
    service.listMine(session.id, query),
    service.myAppointments(session.id),
  ]);
  return (
    <FeedbackPanel
      rows={result.rows.map(({ id, topic, message, appointmentCode, status, createdAt }) => ({
        id,
        topic,
        message,
        appointmentCode,
        status,
        createdAt: createdAt.toISOString(),
      }))}
      appointments={appointments.map((row) => ({ ...row, examDate: row.examDate.toISOString() }))}
      total={result.total}
      page={query.page}
      pageSize={query.pageSize}
    />
  );
}
