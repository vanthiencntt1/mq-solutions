import { AppError } from '@/lib/domain/errors';
import type { CreateReviewInput, ReviewDeps, ReviewSummary } from './types';

export class ReviewService {
  constructor(private readonly d: ReviewDeps) {}

  async create(accountId: string, input: CreateReviewInput) {
    const limit = await this.d.limiter.hit(`review:${accountId}`, 5, 60 * 60);
    if (!limit.allowed) throw new AppError('RATE_LIMITED');
    const appointment = await this.d.repo.appointment(input.appointmentId, accountId);
    if (!appointment) throw new AppError('REVIEW_APPOINTMENT_NOT_FOUND');
    // A09 mục 1: quyền viết đánh giá dựa trên chủ phiếu và trạng thái đã khám của phiếu.
    if (appointment.status !== 'DA_KHAM') throw new AppError('REVIEW_NOT_ELIGIBLE');
    return this.d.repo.create({
      appointmentId: input.appointmentId,
      accountId,
      facilityId: appointment.facilityId,
      rating: input.rating,
      comment: input.comment || null,
    });
  }

  async published(code: string, page: number, pageSize: number) {
    const facilityId = await this.d.repo.facilityIdByCode(code);
    if (!facilityId) throw new AppError('NOT_FOUND');
    let summary: ReviewSummary | null = await this.d.cache.get(facilityId);
    if (!summary) {
      summary = await this.d.repo.summary(facilityId);
      await this.d.cache.set(facilityId, summary);
    }
    const reviews = await this.d.repo.published(facilityId, (page - 1) * pageSize, pageSize);
    return { reviews, summary };
  }
}
