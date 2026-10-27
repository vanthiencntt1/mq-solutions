import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import {
  defaultTemplate,
  EmailJobSchema,
  renderTemplate,
  sampleVariables,
  TEMPLATE_CODES,
  TEMPLATE_SPECS,
  TemplateBodySchema,
  validateTemplate,
} from './templates';
import type { EmailJob, NewNotification, NotificationDeps, TemplateCode } from './types';

const NotificationBaseSchema = z.object({
  type: z.enum(['BOOKED', 'REMIND', 'CANCELLED', 'REFUNDED', 'RESULT_READY', 'SYSTEM']),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2000),
  link: z.string().max(300).nullable().optional(),
});

const validLink = (value: { link?: string | null }, ctx: z.RefinementCtx) => {
  if (
    value.link &&
    (!value.link.startsWith('/') || value.link.startsWith('//') || value.link.startsWith('/\\'))
  )
    ctx.addIssue({ code: 'custom', path: ['link'], message: 'Link phải thuộc website' });
};

export const NotificationInputSchema = NotificationBaseSchema.superRefine(validLink);

export const BroadcastSchema = NotificationBaseSchema.pick({ title: true, body: true, link: true })
  .extend({
    facilityId: z.uuid().nullable(),
  })
  .superRefine(validLink);
export const ListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

/** A08/W08: mọi thao tác trên thông báo bệnh nhân đều buộc accountId từ phiên. */
export class NotificationService {
  constructor(private readonly d: NotificationDeps) {}

  async create(accountId: string, input: NewNotification): Promise<void> {
    await this.d.repo.create(accountId, NotificationInputSchema.parse(input));
  }

  async list(accountId: string, page: number, pageSize: number) {
    const [result, unread] = await Promise.all([
      this.d.repo.list(accountId, page, pageSize),
      this.d.repo.unreadCount(accountId),
    ]);
    return { ...result, unread };
  }

  unreadCount(accountId: string): Promise<number> {
    return this.d.repo.unreadCount(accountId);
  }

  async markRead(accountId: string, id: string): Promise<void> {
    if (!(await this.d.repo.markRead(accountId, id, this.d.now()))) throw new AppError('NOT_FOUND');
  }

  async listTemplates() {
    const saved = new Map((await this.d.repo.listTemplates()).map((row) => [row.code, row]));
    return TEMPLATE_CODES.map((code) => ({
      ...defaultTemplate(code),
      ...saved.get(code),
      label: TEMPLATE_SPECS[code].label,
      variables: TEMPLATE_SPECS[code].variables,
    }));
  }

  async saveTemplate(code: TemplateCode, subject: string, bodyJson: unknown, adminId: string): Promise<void> {
    const body = TemplateBodySchema.parse(bodyJson);
    validateTemplate(code, subject, body.text);
    await this.d.repo.saveTemplate({ code, subject, bodyJson: body }, adminId);
  }

  async render(code: TemplateCode, vars: Record<string, string>) {
    const row = (await this.d.repo.getTemplate(code)) ?? defaultTemplate(code);
    // DB có thể chứa JSON cũ; kiểm lại trước khi kết hợp với dữ liệu nhạy cảm.
    const bodyJson = TemplateBodySchema.parse(row.bodyJson);
    return renderTemplate({ ...row, bodyJson }, vars);
  }

  preview(code: TemplateCode, subject: string, bodyJson: unknown) {
    const body = TemplateBodySchema.parse(bodyJson);
    return renderTemplate({ code, subject, bodyJson: body }, sampleVariables(code));
  }

  async queueEmail(input: EmailJob): Promise<void> {
    const job = EmailJobSchema.parse(input);
    await this.d.queue.add(job);
    await this.d.repo.logEmail(job.code, this.d.hashEmail(job.to), 'QUEUED');
  }

  async sendEmailJob(input: unknown): Promise<void> {
    const job = EmailJobSchema.parse(input);
    const rendered = await this.render(job.code, job.vars);
    await this.d.mailer.send({
      to: job.to,
      subject: rendered.subject,
      html: rendered.html,
      attachments: job.attachments?.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.base64, 'base64'),
      })),
    });
    await this.d.repo.logEmail(job.code, this.d.hashEmail(job.to), 'SENT');
  }

  async failEmailJob(input: unknown): Promise<void> {
    const job = EmailJobSchema.safeParse(input);
    if (job.success) await this.d.repo.logEmail(job.data.code, this.d.hashEmail(job.data.to), 'FAILED');
  }

  listEmailLogs(page: number, pageSize: number) {
    return this.d.repo.listEmailLogs(page, pageSize);
  }

  facilities(admin: AdminPrincipal) {
    return this.d.repo.facilities(admin.facilityIds);
  }

  async broadcast(
    admin: AdminPrincipal,
    input: { title: string; body: string; link?: string | null; facilityId: string | null },
  ): Promise<number> {
    const parsed = BroadcastSchema.parse(input);
    if (admin.facilityIds !== null) {
      if (!parsed.facilityId || !admin.facilityIds.includes(parsed.facilityId))
        throw new AppError('FORBIDDEN');
    }
    if (parsed.facilityId && !(await this.d.repo.facilityExists(parsed.facilityId)))
      throw new AppError('NOT_FOUND');
    return this.d.repo.broadcast(
      { type: 'SYSTEM', title: parsed.title, body: parsed.body, link: parsed.link },
      parsed.facilityId,
    );
  }
}
