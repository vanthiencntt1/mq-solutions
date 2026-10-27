import { describe, expect, it, vi } from 'vitest';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { AdminReviewService } from '@/lib/services/admin-review/admin-review-service';
import {
  AdminReviewQuerySchema,
  ContactQuerySchema,
  type AdminReviewRepository,
} from '@/lib/services/admin-review/types';

const facilityId = '40575916-9f38-4ac8-8c69-42cd54901f94';
const actor: AdminPrincipal = {
  id: 'admin',
  role: 'FACILITY_MANAGER',
  facilityIds: [facilityId],
  name: 'Quản trị',
  permissions: ['review:read'],
};
const review = {
  id: 'review-1',
  facilityId,
  facilityName: 'Cơ sở 1',
  rating: 4,
  comment: 'Ổn',
  status: 'PENDING',
  reply: null,
  createdAt: new Date('2026-01-01'),
};
const contact = {
  id: 'contact-1',
  type: 'CO_SO',
  org: 'Đơn vị',
  name: 'Người gửi',
  phone: '0900000000',
  email: 'a@example.com',
  message: 'Hợp tác',
  status: 'NEW',
  assignee: null,
  note: null,
  createdAt: new Date('2026-01-01'),
};

function setup() {
  const repo: AdminReviewRepository = {
    listReviews: vi.fn(async () => ({ rows: [review], total: 1 })),
    findReview: vi.fn(async (_id, ids) => (ids?.includes(facilityId) || ids === null ? review : null)),
    updateReview: vi.fn(async (_id, input) => ({ ...review, ...input })),
    facilities: vi.fn(async () => [{ id: facilityId, name: 'Cơ sở 1' }]),
    listContacts: vi.fn(async () => ({ rows: [contact], total: 1 })),
    findContact: vi.fn(async () => contact),
    updateContact: vi.fn(async (_id, input) => ({ ...contact, ...input })),
    assigneeExists: vi.fn(async () => true),
    assignees: vi.fn(async () => [{ id: 'admin', name: 'Quản trị' }]),
    audit: vi.fn(async () => undefined),
  };
  const cache = {
    get: vi.fn(async () => null),
    set: vi.fn(async () => undefined),
    del: vi.fn(async () => undefined),
  };
  return { service: new AdminReviewService({ repo, cache }), repo, cache };
}

describe('A09 – duyệt đánh giá và liên hệ', () => {
  it('lọc cơ sở ở cả danh sách và thao tác duyệt', async () => {
    const { service, repo, cache } = setup();
    const query = AdminReviewQuerySchema.parse({ page: '1', facilityId });
    await service.listReviews(actor, query);
    expect(repo.listReviews).toHaveBeenCalledWith(query, [facilityId]);
    await expect(service.listReviews(actor, { ...query, facilityId: 'other' })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await service.moderate(actor, review.id, { status: 'SHOWN' });
    expect(cache.del).toHaveBeenCalledWith(facilityId);
    expect(repo.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'REVIEW_MODERATE' }));
  });

  it('không xóa cache điểm khi chỉ sửa trả lời', async () => {
    const { service, cache } = setup();
    await service.moderate(actor, review.id, { reply: 'Cảm ơn bạn' });
    expect(cache.del).not.toHaveBeenCalled();
  });

  it('chỉ admin toàn hệ thống được xem và xử lý liên hệ', async () => {
    const { service, repo } = setup();
    const query = ContactQuerySchema.parse({ page: '1' });
    await expect(service.listContacts(actor, query)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const global = { ...actor, facilityIds: null };
    await expect(service.listContacts(global, query)).resolves.toMatchObject({ total: 1 });
    await service.updateContact(global, contact.id, { status: 'IN_PROGRESS', note: 'Đã gọi' });
    expect(repo.updateContact).toHaveBeenCalledWith(contact.id, { status: 'IN_PROGRESS', note: 'Đã gọi' });
    expect(repo.audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CONTACT_UPDATE', facilityId: null }),
    );
  });

  it('bộ lọc rỗng được bỏ qua và chỉ nhận trạng thái hợp lệ', () => {
    expect(AdminReviewQuerySchema.parse({ facilityId: '', rating: '', status: '' })).toMatchObject({
      page: 1,
    });
    expect(ContactQuerySchema.safeParse({ status: 'INVALID' }).success).toBe(false);
  });
});
