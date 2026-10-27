import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type { FeedbackDeps } from '@/lib/domain/feedback/ports';
import type { FeedbackRow } from '@/lib/domain/feedback/types';
import type {
  AdminFeedbackListQuery,
  CreateFeedbackInput,
  FeedbackListQuery,
  UpdateFeedbackInput,
} from '@/lib/domain/feedback/schemas';

export class FeedbackService {
  constructor(private readonly d: FeedbackDeps) {}

  async create(accountId: string, ipHash: string, input: CreateFeedbackInput) {
    // A09 mục 3 / quy ước mục 6: chặn spam theo cả tài khoản và IP trước khi ghi DB.
    const [accountLimit, ipLimit] = await Promise.all([
      this.d.limiter.hit(`feedback:account:${accountId}`, 5, 60 * 60),
      this.d.limiter.hit(`feedback:ip:${ipHash}`, 20, 60 * 60),
    ]);
    if (!accountLimit.allowed || !ipLimit.allowed) throw new AppError('RATE_LIMITED');
    if (input.appointmentId && !(await this.d.repo.ownAppointment(input.appointmentId, accountId)))
      throw new AppError('G2_FEEDBACK_APPOINTMENT_NOT_FOUND');
    return this.d.repo.create(accountId, {
      topic: input.topic,
      message: input.message,
      appointmentId: input.appointmentId ?? null,
    });
  }

  listMine(accountId: string, query: FeedbackListQuery) {
    return this.d.repo.listMine(accountId, query);
  }

  myAppointments(accountId: string) {
    return this.d.repo.myAppointments(accountId);
  }

  listAdmin(actor: AdminPrincipal, query: AdminFeedbackListQuery) {
    this.requireAdmin(actor);
    this.assertFacility(actor, query.facilityId);
    return this.d.repo.listAdmin(query, actor.facilityIds);
  }

  assignees(actor: AdminPrincipal) {
    this.requireAdmin(actor);
    return this.d.repo.assignees(actor.facilityIds);
  }

  async updateAdmin(actor: AdminPrincipal, id: string, input: UpdateFeedbackInput) {
    this.requireAdmin(actor);
    const row = await this.d.repo.findAdmin(id, actor.facilityIds);
    if (!row) throw new AppError('NOT_FOUND');
    if (input.assignee && !(await this.d.repo.assigneeAllowed(input.assignee, row.facilityId)))
      throw new AppError('G2_FEEDBACK_ASSIGNEE_INVALID');
    const updated = await this.d.repo.updateAdmin(row, input, actor.id);
    if (input.status === 'DONE' && row.status !== 'DONE') await this.sendDoneEmail(row);
    return updated;
  }

  async resendDoneEmail(actor: AdminPrincipal, id: string): Promise<void> {
    this.requireAdmin(actor);
    const row = await this.d.repo.findAdmin(id, actor.facilityIds);
    if (!row) throw new AppError('NOT_FOUND');
    if (row.status !== 'DONE') throw new AppError('G2_FEEDBACK_NOT_DONE');
    await this.d.repo.auditEmailRetry(id, actor.id, row.facilityId);
    await this.sendDoneEmail(row);
  }

  private async sendDoneEmail(row: FeedbackRow): Promise<void> {
    const email = await this.d.repo.patientEmail(row.accountId);
    if (!email) throw new AppError('G2_FEEDBACK_EMAIL_UNAVAILABLE');
    await this.d.mailer.send({
      to: email,
      subject: 'Góp ý của bạn đã được xử lý - MQ Solutions',
      html: '<p>Góp ý của bạn đã được xử lý. Vui lòng đăng nhập MQ Solutions để xem trạng thái trong mục Góp ý.</p>',
    });
  }

  private requireAdmin(actor: AdminPrincipal) {
    if (!can({ name: actor.role, permissions: actor.permissions }, PERMISSIONS.REVIEW_READ))
      throw new AppError('FORBIDDEN');
  }

  private assertFacility(actor: AdminPrincipal, facilityId?: string) {
    if (facilityId && actor.facilityIds !== null && !actor.facilityIds.includes(facilityId))
      throw new AppError('FORBIDDEN');
  }
}
