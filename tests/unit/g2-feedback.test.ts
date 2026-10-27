import { describe, expect, it, vi } from 'vitest';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type { FeedbackRepository } from '@/lib/domain/feedback/ports';
import {
  adminFeedbackListSchema,
  createFeedbackSchema,
  updateFeedbackSchema,
} from '@/lib/domain/feedback/schemas';
import type { FeedbackRow } from '@/lib/domain/feedback/types';
import { FeedbackService } from '@/lib/services/feedback/feedback-service';

const accountId = 'b4217c26-279e-407e-903d-e8935e451c34';
const facilityId = '40575916-9f38-4ac8-8c69-42cd54901f94';
const appointmentId = '44c65ca4-ad2d-492b-bec8-34ef89b060b3';
const feedbackId = '2ca3652f-85ee-4ef7-9a47-6baa45d075ea';
const assigneeId = 'b34ed922-b5fa-46a4-ae5f-16d7cfc438bd';

const row: FeedbackRow = {
  id: feedbackId,
  accountId,
  topic: 'GOPY',
  message: 'Tôi muốn góp ý dịch vụ',
  appointmentId,
  appointmentCode: 'MQ123456',
  facilityId,
  facilityName: 'Cơ sở A',
  status: 'NEW',
  assignee: null,
  createdAt: new Date('2026-10-27T02:00:00Z'),
};

const actor: AdminPrincipal = {
  id: assigneeId,
  role: 'FACILITY_MANAGER',
  facilityIds: [facilityId],
  name: 'Nhân viên',
  permissions: ['review:read'],
};

function setup(overrides: Partial<FeedbackRepository> = {}) {
  const repo: FeedbackRepository = {
    ownAppointment: vi.fn(async () => ({ id: appointmentId })),
    myAppointments: vi.fn(async () => []),
    create: vi.fn(async () => row),
    listMine: vi.fn(async () => ({ rows: [row], total: 1 })),
    listAdmin: vi.fn(async () => ({ rows: [row], total: 1 })),
    findAdmin: vi.fn(async () => row),
    assignees: vi.fn(async () => [{ id: assigneeId, name: 'Nhân viên', facilityId }]),
    assigneeAllowed: vi.fn(async () => true),
    updateAdmin: vi.fn(async (_row, input) => ({ ...row, ...input })),
    auditEmailRetry: vi.fn(async () => undefined),
    patientEmail: vi.fn(async () => 'patient@example.com'),
    ...overrides,
  };
  const limiter = { hit: vi.fn(async () => ({ allowed: true, count: 1 })) };
  const mailer = { send: vi.fn(async () => undefined) };
  return { service: new FeedbackService({ repo, limiter, mailer }), repo, limiter, mailer };
}

describe('G2 – góp ý bệnh nhân', () => {
  it('chỉ nhận chủ đề và nội dung hợp lệ', () => {
    expect(createFeedbackSchema.safeParse({ topic: 'BAD', message: 'Nội dung đủ dài' }).success).toBe(false);
    expect(createFeedbackSchema.safeParse({ topic: 'GOPY', message: 'x'.repeat(2001) }).success).toBe(false);
    expect(createFeedbackSchema.safeParse({ topic: 'GOPY', message: '  Nội dung hợp lệ  ' }).success).toBe(
      true,
    );
    expect(updateFeedbackSchema.safeParse({ status: 'WAITING' }).success).toBe(false);
  });

  it('kiểm chủ phiếu và giới hạn tần suất trước khi ghi', async () => {
    const { service, repo, limiter } = setup();
    await service.create(accountId, 'ip-hash', {
      topic: 'GOPY',
      message: 'Tôi muốn góp ý dịch vụ',
      appointmentId,
    });
    expect(repo.ownAppointment).toHaveBeenCalledWith(appointmentId, accountId);
    expect(repo.create).toHaveBeenCalledWith(accountId, expect.objectContaining({ appointmentId }));
    expect(limiter.hit).toHaveBeenCalledTimes(2);

    const foreign = setup({ ownAppointment: vi.fn(async () => null) });
    await expect(
      foreign.service.create(accountId, 'ip', {
        topic: 'GOPY',
        message: 'Tôi muốn góp ý dịch vụ',
        appointmentId,
      }),
    ).rejects.toMatchObject({ code: 'G2_FEEDBACK_APPOINTMENT_NOT_FOUND' });
    expect(foreign.repo.create).not.toHaveBeenCalled();

    const limited = setup();
    limited.limiter.hit.mockResolvedValue({ allowed: false, count: 21 });
    await expect(
      limited.service.create(accountId, 'ip', { topic: 'HO_TRO', message: 'Tôi cần hỗ trợ' }),
    ).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(limited.repo.create).not.toHaveBeenCalled();
  });

  it('lọc phạm vi cơ sở cả khi xem danh sách và cập nhật', async () => {
    const { service, repo } = setup();
    const query = adminFeedbackListSchema.parse({ facilityId });
    await service.listAdmin(actor, query);
    expect(repo.listAdmin).toHaveBeenCalledWith(query, [facilityId]);
    expect(() => service.listAdmin(actor, { ...query, facilityId: accountId })).toThrowError(
      expect.objectContaining({ code: 'FORBIDDEN' }),
    );
    const foreign = setup({ findAdmin: vi.fn(async () => null) });
    await expect(foreign.service.updateAdmin(actor, feedbackId, { status: 'DONE' })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(foreign.repo.updateAdmin).not.toHaveBeenCalled();
  });

  it('chỉ phân công người phù hợp và gửi email khi chuyển sang đã xong', async () => {
    const invalid = setup({ assigneeAllowed: vi.fn(async () => false) });
    await expect(
      invalid.service.updateAdmin(actor, feedbackId, { assignee: assigneeId }),
    ).rejects.toMatchObject({ code: 'G2_FEEDBACK_ASSIGNEE_INVALID' });

    const { service, repo, mailer } = setup();
    await service.updateAdmin(actor, feedbackId, { status: 'IN_PROGRESS', assignee: assigneeId });
    expect(repo.updateAdmin).toHaveBeenCalledWith(
      row,
      { status: 'IN_PROGRESS', assignee: assigneeId },
      actor.id,
    );
    expect(mailer.send).not.toHaveBeenCalled();
    await service.updateAdmin(actor, feedbackId, { status: 'DONE' });
    expect(mailer.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'patient@example.com' }));
  });

  it('chỉ gửi lại email cho góp ý đã xong trong phạm vi cơ sở', async () => {
    const open = setup();
    await expect(open.service.resendDoneEmail(actor, feedbackId)).rejects.toMatchObject({
      code: 'G2_FEEDBACK_NOT_DONE',
    });
    const done = setup({ findAdmin: vi.fn(async () => ({ ...row, status: 'DONE' as const })) });
    await done.service.resendDoneEmail(actor, feedbackId);
    expect(done.mailer.send).toHaveBeenCalledTimes(1);
    expect(done.repo.auditEmailRetry).toHaveBeenCalledWith(feedbackId, actor.id, facilityId);
    const foreign = setup({ findAdmin: vi.fn(async () => null) });
    await expect(foreign.service.resendDoneEmail(actor, feedbackId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('có thể gửi lại sau khi SMTP lỗi nhưng trạng thái đã lưu', async () => {
    let current = row;
    const { service, mailer } = setup({
      findAdmin: vi.fn(async () => current),
      updateAdmin: vi.fn(async (_old, input) => {
        current = { ...current, ...input };
        return current;
      }),
    });
    mailer.send.mockRejectedValueOnce(new Error('SMTP unavailable'));
    await expect(service.updateAdmin(actor, feedbackId, { status: 'DONE' })).rejects.toThrow(
      'SMTP unavailable',
    );
    expect(current.status).toBe('DONE');
    await service.resendDoneEmail(actor, feedbackId);
    expect(mailer.send).toHaveBeenCalledTimes(2);
  });
});
