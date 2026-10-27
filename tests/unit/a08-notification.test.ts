import { describe, expect, it } from 'vitest';
import { NotificationService } from '@/lib/services/notification/notification-service';
import type {
  NotificationRepository,
  EmailTemplateRow,
  NotificationRow,
} from '@/lib/services/notification/types';
import type { AdminPrincipal } from '@/lib/services/admin-auth';

const now = new Date('2026-10-27T09:00:00Z');
const FACILITY_A = '11111111-1111-4111-8111-111111111111';
const FACILITY_B = '22222222-2222-4222-8222-222222222222';
const manager: AdminPrincipal = {
  id: 'admin',
  name: 'Quản lý',
  role: 'FACILITY_MANAGER',
  facilityIds: [FACILITY_A],
  permissions: ['notification:read', 'content:write'],
};

function setup() {
  const templates = new Map<string, EmailTemplateRow>();
  const rows: (NotificationRow & { accountId: string })[] = [];
  const queued: unknown[] = [];
  const sent: { to: string; html: string }[] = [];
  const logs: { status: string; toHash: string }[] = [];
  let broadcastCount = 0;
  const repo: NotificationRepository = {
    getTemplate: async (code) => templates.get(code) ?? null,
    listTemplates: async () => [...templates.values()],
    saveTemplate: async (row) => {
      templates.set(row.code, row);
    },
    logEmail: async (_code, toHash, status) => {
      logs.push({ toHash, status });
    },
    listEmailLogs: async () => ({ rows: [], total: 0, today: 0 }),
    list: async (accountId) => ({
      rows: rows.filter((row) => row.accountId === accountId),
      total: rows.filter((row) => row.accountId === accountId).length,
    }),
    unreadCount: async (accountId) => rows.filter((row) => row.accountId === accountId && !row.readAt).length,
    create: async (accountId, input) => {
      rows.push({
        ...input,
        accountId,
        id: `n-${rows.length}`,
        link: input.link ?? null,
        readAt: null,
        createdAt: now,
      });
    },
    markRead: async (accountId, id, at) => {
      const row = rows.find((item) => item.accountId === accountId && item.id === id);
      if (!row) return false;
      row.readAt ??= at;
      return true;
    },
    broadcast: async (_input, facilityId) => {
      broadcastCount++;
      return facilityId ? 2 : 4;
    },
    facilities: async () => [{ id: FACILITY_A, name: 'A' }],
    facilityExists: async (id) => id === FACILITY_A,
  };
  const service = new NotificationService({
    repo,
    queue: {
      add: async (job) => {
        queued.push(job);
      },
    },
    mailer: {
      send: async (mail) => {
        sent.push({ to: mail.to, html: mail.html });
      },
    },
    hashEmail: () => 'hashed-recipient',
    now: () => now,
  });
  return { service, templates, rows, queued, sent, logs, broadcasts: () => broadcastCount };
}

describe('A08 – mẫu và gửi email', () => {
  it('dùng mẫu mặc định, escape HTML và không lưu nội dung vào EmailLog', async () => {
    const { service, queued, sent, logs } = setup();
    const vars = { matKhauMoi: '<bí mật>' };
    expect((await service.render('PASSWORD_RESET', vars)).html).toContain('&lt;bí mật&gt;');
    await service.queueEmail({ code: 'PASSWORD_RESET', to: 'patient@example.com', vars });
    expect(queued).toHaveLength(1);
    await service.sendEmailJob(queued[0]);
    expect(sent[0]?.html).toContain('&lt;bí mật&gt;');
    expect(logs).toEqual([
      { status: 'QUEUED', toHash: 'hashed-recipient' },
      { status: 'SENT', toHash: 'hashed-recipient' },
    ]);
    expect(JSON.stringify(logs)).not.toContain('bí mật');
    expect(JSON.stringify(logs)).not.toContain('patient@example.com');
  });

  it('mẫu vừa sửa được sử dụng và biến lạ bị từ chối', async () => {
    const { service } = setup();
    await service.saveTemplate(
      'PASSWORD_RESET',
      'Đổi mật khẩu {{matKhauMoi}}',
      { text: 'Mã mới: {{matKhauMoi}}' },
      'admin',
    );
    expect((await service.render('PASSWORD_RESET', { matKhauMoi: '123' })).subject).toBe('Đổi mật khẩu 123');
    await expect(
      service.saveTemplate('PASSWORD_RESET', 'Sai {{cccd}}', { text: 'Nội dung' }, 'admin'),
    ).rejects.toMatchObject({ code: 'NOTIFICATION_TEMPLATE_VARIABLE' });
    expect(() =>
      service.preview('PASSWORD_RESET', 'Mẫu', { text: '<script>{{matKhauMoi}}</script>' }),
    ).not.toThrow();
    expect(
      service.preview('PASSWORD_RESET', 'Mẫu', { text: '<script>{{matKhauMoi}}</script>' }).html,
    ).toContain('&lt;script&gt;');
  });
});

describe('A08 – thông báo trong web', () => {
  it('chỉ chủ tài khoản mới đọc được thông báo và badge khớp danh sách', async () => {
    const { service } = setup();
    await service.create('account-a', { type: 'BOOKED', title: 'Đã đặt khám', body: 'Phiếu của bạn' });
    expect((await service.list('account-a', 1, 20)).unread).toBe(1);
    await expect(service.markRead('account-b', 'n-0')).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await service.markRead('account-a', 'n-0');
    expect((await service.list('account-a', 1, 20)).unread).toBe(0);
  });

  it('quản lý cơ sở chỉ gửi cho cơ sở trong phạm vi', async () => {
    const { service, broadcasts } = setup();
    const input = { title: 'Cập nhật', body: 'Thông báo hệ thống', link: '/tai-khoan', facilityId: null };
    await expect(service.broadcast(manager, input)).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(service.broadcast(manager, { ...input, facilityId: FACILITY_B })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    expect(await service.broadcast(manager, { ...input, facilityId: FACILITY_A })).toBe(2);
    expect(broadcasts()).toBe(1);
    await expect(
      service.broadcast(manager, { ...input, link: '//outside.test', facilityId: FACILITY_A }),
    ).rejects.toBeDefined();
  });
});
