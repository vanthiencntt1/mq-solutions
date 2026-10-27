import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type {
  AdminReviewDeps,
  AdminReviewQuery,
  ContactQuery,
  ContactUpdateInput,
  ReviewModerationInput,
} from './types';

export class AdminReviewService {
  constructor(private readonly d: AdminReviewDeps) {}

  async listReviews(actor: AdminPrincipal, query: AdminReviewQuery) {
    this.requireReview(actor);
    if (query.facilityId && actor.facilityIds !== null && !actor.facilityIds.includes(query.facilityId))
      throw new AppError('FORBIDDEN');
    return this.d.repo.listReviews(query, actor.facilityIds);
  }

  facilities(actor: AdminPrincipal) {
    this.requireReview(actor);
    return this.d.repo.facilities(actor.facilityIds);
  }

  async moderate(actor: AdminPrincipal, id: string, input: ReviewModerationInput) {
    this.requireReview(actor);
    const review = await this.d.repo.findReview(id, actor.facilityIds);
    if (!review) throw new AppError('NOT_FOUND');
    const updated = await this.d.repo.updateReview(id, input);
    if (input.status && input.status !== review.status) await this.d.cache.del(review.facilityId);
    await this.d.repo.audit({
      actorId: actor.id,
      action: 'REVIEW_MODERATE',
      facilityId: review.facilityId,
      target: id,
    });
    return updated;
  }

  async listContacts(actor: AdminPrincipal, query: ContactQuery) {
    this.requireGlobal(actor);
    return this.d.repo.listContacts(query);
  }

  assignees(actor: AdminPrincipal) {
    this.requireGlobal(actor);
    return this.d.repo.assignees();
  }

  async updateContact(actor: AdminPrincipal, id: string, input: ContactUpdateInput) {
    this.requireGlobal(actor);
    if (!(await this.d.repo.findContact(id))) throw new AppError('NOT_FOUND');
    if (input.assignee && !(await this.d.repo.assigneeExists(input.assignee)))
      throw new AppError('NOT_FOUND');
    const updated = await this.d.repo.updateContact(id, input);
    await this.d.repo.audit({ actorId: actor.id, action: 'CONTACT_UPDATE', facilityId: null, target: id });
    return updated;
  }

  private requireGlobal(actor: AdminPrincipal) {
    this.requireReview(actor);
    // A09 mục 2: ContactLead không có facilityId nên không thể áp dụng phạm vi cơ sở.
    if (actor.facilityIds !== null) throw new AppError('FORBIDDEN');
  }

  private requireReview(actor: AdminPrincipal) {
    if (!can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.REVIEW_READ))
      throw new AppError('FORBIDDEN');
  }
}
