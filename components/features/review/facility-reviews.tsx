'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { apiFetch, ApiError } from '@/components/common/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, FormField } from '@/components/ui/form-field';
import { formatDate } from '@/lib/utils/format';

interface ReviewView {
  id: string;
  rating: number;
  comment: string | null;
  reply: string | null;
  createdAt: string;
}
interface ReviewResult {
  reviews: ReviewView[];
  summary: { average: number; count: number };
}

/** W03 có thể truyền ID phiếu DA_KHAM của chính phiên hiện tại để mở form. */
export function FacilityReviews({
  facilityCode,
  eligibleAppointmentId,
}: {
  facilityCode: string;
  eligibleAppointmentId?: string;
}) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;
    apiFetch<ReviewResult>(`/api/reviews?facilityCode=${encodeURIComponent(facilityCode)}`)
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof ApiError ? cause.message : 'Chưa tải được đánh giá.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [facilityCode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!eligibleAppointmentId) return;
    setPending(true);
    setError('');
    try {
      await apiFetch('/api/reviews', {
        method: 'POST',
        body: { appointmentId: eligibleAppointmentId, rating, comment: comment.trim() || null },
      });
      setSubmitted(true);
      setNotice('Đã gửi đánh giá. Nội dung sẽ hiển thị sau khi được duyệt.');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Chưa gửi được đánh giá.');
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="facility-reviews-title" className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="facility-reviews-title" className="text-ink-navy text-[26px] font-bold">
            Đánh giá từ người bệnh
          </h2>
          <p className="text-slate-gray text-sm">Nhận xét từ những người đã khám tại cơ sở.</p>
        </div>
        {result ? (
          <p className="text-ink-navy flex items-center gap-2 font-semibold">
            <Star size={20} aria-hidden="true" className="fill-warning text-warning" />
            {result.summary.count ? result.summary.average.toFixed(1) : '—'} / 5
            <span className="text-slate-gray text-sm font-normal">({result.summary.count} đánh giá)</span>
          </p>
        ) : null}
      </div>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      {notice ? <Alert tone="success">{notice}</Alert> : null}
      {loading ? (
        <p className="text-slate-gray" role="status">
          Đang tải đánh giá…
        </p>
      ) : result?.reviews.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {result.reviews.map((review) => (
            <Card key={review.id} className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-warning flex items-center gap-1 font-semibold">
                  <Star size={16} aria-hidden="true" /> {review.rating}/5 sao
                </span>
                <time className="text-slate-gray text-xs" dateTime={review.createdAt}>
                  {formatDate(review.createdAt)}
                </time>
              </div>
              <p className="text-ink-navy whitespace-pre-wrap">
                {review.comment || 'Người bệnh đã đánh giá cơ sở.'}
              </p>
              {review.reply ? (
                <div className="bg-muted rounded-md p-3 text-sm">
                  <strong className="text-ink-navy">Phản hồi của cơ sở</strong>
                  <p className="text-slate-gray mt-1 whitespace-pre-wrap">{review.reply}</p>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <p className="text-slate-gray flex items-center gap-2">
          <MessageSquare size={18} aria-hidden="true" /> Chưa có đánh giá được duyệt.
        </p>
      )}
      {eligibleAppointmentId && !submitted ? (
        <Card className="space-y-4">
          <h3 className="text-ink-navy text-lg font-semibold">Chia sẻ trải nghiệm của bạn</h3>
          <form onSubmit={submit} className="space-y-4">
            <FormField id="review-rating" label="Số sao">
              <select
                id="review-rating"
                value={rating}
                onChange={(event) => setRating(Number(event.target.value))}
                className="border-border bg-card h-11 w-full rounded-md border px-3 sm:max-w-48"
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} sao
                  </option>
                ))}
              </select>
            </FormField>
            <FormField id="review-comment" label="Nhận xét (không bắt buộc)">
              <textarea
                id="review-comment"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={4}
                className="border-border bg-card w-full rounded-md border p-3"
              />
            </FormField>
            <Button type="submit" disabled={pending}>
              {pending ? 'Đang gửi…' : 'Gửi đánh giá'}
            </Button>
          </form>
        </Card>
      ) : null}
    </section>
  );
}
