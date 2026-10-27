'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CircleHelp, Clock3, Inbox, MessageSquareText, Send } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { IconTile } from '@/components/ui/icon-tile';
import { Alert, FormField } from '@/components/ui/form-field';
import {
  FEEDBACK_STATUS,
  FEEDBACK_TOPICS,
  type FeedbackStatus,
  type FeedbackTopic,
} from '@/lib/domain/feedback/types';
import { formatDate, formatDateTime } from '@/lib/utils/format';

interface Row {
  id: string;
  topic: FeedbackTopic;
  message: string;
  appointmentCode: string | null;
  status: FeedbackStatus;
  createdAt: string;
}

interface AppointmentOption {
  id: string;
  code: string;
  facilityName: string;
  examDate: string;
}

interface Props {
  rows: Row[];
  appointments: AppointmentOption[];
  total: number;
  page: number;
  pageSize: number;
}

const fieldStyle =
  'border-hairline bg-pebble text-ink-navy focus-visible:border-primary min-h-12 w-full rounded-md border px-3 text-base';
const topics = Object.entries(FEEDBACK_TOPICS) as [FeedbackTopic, string][];

export function FeedbackPanel({ rows, appointments, total, page, pageSize }: Props) {
  const router = useRouter();
  const [topic, setTopic] = useState<FeedbackTopic>('GOPY');
  const [message, setMessage] = useState('');
  const [appointmentId, setAppointmentId] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError('');
    setNotice('');
    try {
      await apiFetch('/api/me/feedback', {
        method: 'POST',
        body: { topic, message: message.trim(), appointmentId: appointmentId || null },
      });
      setMessage('');
      setAppointmentId('');
      setNotice('Đã gửi góp ý. Bạn có thể theo dõi trạng thái bên dưới.');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa gửi được góp ý, vui lòng thử lại.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 space-y-8 pb-8">
      <header>
        <h1 className="text-ink-navy text-[38px] leading-tight font-bold md:text-[50px]">Góp ý và hỗ trợ</h1>
        <p className="text-slate-gray mt-2">Chia sẻ trải nghiệm hoặc đề nghị chúng tôi hỗ trợ bạn.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card variant="panel" className="h-fit min-w-0 space-y-6 p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <IconTile>
              <MessageSquareText aria-hidden />
            </IconTile>
            <h2 className="section-title">Gửi góp ý</h2>
          </div>
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {notice ? <Alert tone="success">{notice}</Alert> : null}
          <form onSubmit={(event) => void submit(event)} className="space-y-4">
            <FormField id="feedback-topic" label="Chủ đề">
              <select
                id="feedback-topic"
                value={topic}
                onChange={(event) => setTopic(event.target.value as FeedbackTopic)}
                className={fieldStyle}
              >
                {topics.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="feedback-appointment"
              label="Phiếu khám liên quan"
              hint="Không bắt buộc. Chỉ chọn phiếu của bạn nếu góp ý liên quan đến một lần đặt khám."
            >
              <select
                id="feedback-appointment"
                value={appointmentId}
                onChange={(event) => setAppointmentId(event.target.value)}
                className={fieldStyle}
              >
                <option value="">Không gắn phiếu khám</option>
                {appointments.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.code} · {row.facilityName} · {formatDate(row.examDate)}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField
              id="feedback-message"
              label="Nội dung"
              hint={`${message.length}/2000 ký tự · Tối thiểu 10 ký tự.`}
            >
              <textarea
                id="feedback-message"
                required
                minLength={10}
                maxLength={2000}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={6}
                className={`${fieldStyle} h-auto min-h-36 py-3`}
                placeholder="Bạn muốn góp ý hoặc cần hỗ trợ điều gì?"
              />
            </FormField>
            <Button type="submit" disabled={pending}>
              <Send size={18} aria-hidden /> {pending ? 'Đang gửi…' : 'Gửi góp ý'}
            </Button>
          </form>
        </Card>
        <section className="min-w-0 space-y-4" aria-labelledby="feedback-history">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 id="feedback-history" className="section-title">
                Lịch sử góp ý
              </h2>
              <p className="text-slate-gray text-sm">{total} góp ý đã gửi</p>
            </div>
          </div>
          {rows.length ? (
            rows.map((row) => <FeedbackCard key={row.id} row={row} />)
          ) : (
            <EmptyState
              icon={Inbox}
              title="Chưa có góp ý"
              description="Góp ý của bạn sẽ xuất hiện ở đây sau khi gửi."
            />
          )}
          {total > pageSize ? (
            <nav
              aria-label="Phân trang góp ý"
              className="flex flex-wrap items-center justify-between gap-3 text-sm"
            >
              <span className="text-slate-gray">
                Trang {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </span>
              <div className="flex gap-4">
                {page > 1 ? (
                  <Link
                    className="text-primary inline-flex min-h-11 items-center font-semibold"
                    href={`?page=${page - 1}`}
                  >
                    ← Trước
                  </Link>
                ) : null}
                {page * pageSize < total ? (
                  <Link
                    className="text-primary inline-flex min-h-11 items-center font-semibold"
                    href={`?page=${page + 1}`}
                  >
                    Tiếp →
                  </Link>
                ) : null}
              </div>
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function FeedbackCard({ row }: { row: Row }) {
  const Icon = row.status === 'DONE' ? CheckCircle2 : row.status === 'IN_PROGRESS' ? Clock3 : CircleHelp;
  const tone = row.status === 'DONE' ? 'success' : row.status === 'IN_PROGRESS' ? 'warning' : 'info';
  return (
    <Card className="space-y-3 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-ink-navy text-xl font-bold">{FEEDBACK_TOPICS[row.topic]}</h3>
          <p className="text-slate-gray text-xs">
            {formatDateTime(row.createdAt)}
            {row.appointmentCode ? ` · Phiếu ${row.appointmentCode}` : ''}
          </p>
        </div>
        <Badge tone={tone}>
          <Icon size={14} aria-hidden /> {FEEDBACK_STATUS[row.status]}
        </Badge>
      </div>
      <p className="text-ink-navy text-sm whitespace-pre-wrap">{row.message}</p>
    </Card>
  );
}
