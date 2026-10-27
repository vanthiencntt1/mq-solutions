import { describe, expect, it, vi } from 'vitest';
import { ReviewService } from '@/lib/services/review/review-service';
import { CreateReviewSchema, type ReviewRepository, type ReviewSummary } from '@/lib/services/review/types';

function setup(status = 'DA_KHAM') {
  const repo: ReviewRepository = {
    appointment: vi.fn(async (_id, accountId) =>
      accountId === 'owner' ? { facilityId: 'facility', status } : null,
    ),
    create: vi.fn(async () => ({ id: 'review', status: 'PENDING' })),
    facilityIdByCode: vi.fn(async (code) => (code === 'BV01' ? 'facility' : null)),
    published: vi.fn(async () => [
      { id: 'shown', rating: 5, comment: 'Tốt', reply: null, createdAt: new Date('2026-01-01') },
    ]),
    summary: vi.fn(async () => ({ average: 5, count: 1 })),
  };
  const cache = {
    get: vi.fn(async (): Promise<ReviewSummary | null> => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
  };
  const limiter = { hit: vi.fn(async () => ({ allowed: true, count: 1 })) };
  return { service: new ReviewService({ repo, cache, limiter }), repo, cache, limiter };
}

const input = { appointmentId: '40575916-9f38-4ac8-8c69-42cd54901f94', rating: 5, comment: 'Hài lòng' };

describe('A09 – đánh giá bệnh nhân', () => {
  it('chỉ tạo đánh giá chờ duyệt cho chủ phiếu đã khám', async () => {
    const { service, repo } = setup();
    await expect(service.create('owner', input)).resolves.toEqual({ id: 'review', status: 'PENDING' });
    expect(repo.create).toHaveBeenCalledWith({
      appointmentId: input.appointmentId,
      accountId: 'owner',
      facilityId: 'facility',
      rating: 5,
      comment: 'Hài lòng',
    });
  });

  it('từ chối người không sở hữu phiếu hoặc phiếu chưa khám', async () => {
    const owned = setup();
    await expect(owned.service.create('other', input)).rejects.toMatchObject({
      code: 'REVIEW_APPOINTMENT_NOT_FOUND',
    });
    expect(owned.repo.create).not.toHaveBeenCalled();
    const pending = setup('DA_CO_STT');
    await expect(pending.service.create('owner', input)).rejects.toMatchObject({
      code: 'REVIEW_NOT_ELIGIBLE',
    });
    expect(pending.repo.create).not.toHaveBeenCalled();
  });

  it('chặn rating ngoài 1–5 và giới hạn tần suất', async () => {
    expect(CreateReviewSchema.safeParse({ ...input, rating: 6 }).success).toBe(false);
    const { service, limiter, repo } = setup();
    vi.mocked(limiter.hit).mockResolvedValue({ allowed: false, count: 6 });
    await expect(service.create('owner', input)).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('trả điểm trung bình đã duyệt, dùng cache theo cơ sở', async () => {
    const { service, repo, cache } = setup();
    const result = await service.published('BV01', 1, 5);
    expect(result.summary).toEqual({ average: 5, count: 1 });
    expect(result.reviews).toHaveLength(1);
    expect(repo.published).toHaveBeenCalledWith('facility', 0, 5);
    expect(cache.set).toHaveBeenCalledWith('facility', result.summary);
    vi.mocked(cache.get).mockResolvedValue({ average: 4, count: 2 });
    await service.published('BV01', 2, 5);
    expect(repo.summary).toHaveBeenCalledTimes(1);
    expect(repo.published).toHaveBeenCalledWith('facility', 5, 5);
  });
});
