import { describe, expect, it, vi } from 'vitest';
import type { MailMessage } from '@/lib/domain/ports';
import { ReportAlertService, type AlertDeps } from '@/lib/services/report/alert-service';

function setup() {
  const claim = vi.fn(async () => true);
  const release = vi.fn(async () => {});
  const send = vi.fn(async (_message: MailMessage) => {});
  const recipients = vi.fn(async () => ['ops@example.com']);
  const deps: AlertDeps = {
    repo: {
      candidates: vi.fn(async () => [
        {
          kind: 'DOWN' as const,
          facilityId: 'facility-a',
          facilityName: '<Cơ sở A>',
          detail: 'HIS <mất kết nối>',
        },
      ]),
      recipients,
    },
    mailer: { send },
    claim,
    release,
    now: () => new Date('2026-10-27T05:00:00Z'),
  };
  return { deps, claim, release, send, recipients };
}

describe('A10 – cảnh báo vận hành', () => {
  it('gửi một cảnh báo, chống gửi trùng và thoát HTML trong tên cơ sở', async () => {
    const { deps, claim, send } = setup();
    const service = new ReportAlertService(deps);
    expect(await service.check()).toBe(1);
    expect(claim).toHaveBeenCalledWith('a10:alert:DOWN:facility-a', 3600);
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ops@example.com',
        html: expect.stringContaining('&lt;Cơ sở A&gt;'),
      }),
    );
    expect(send.mock.calls[0]?.[0].html).toContain('&lt;mất kết nối&gt;');
    claim.mockResolvedValueOnce(false);
    expect(await service.check()).toBe(0);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('nhả khóa khi gửi thư đầu tiên lỗi để job sau thử lại', async () => {
    const { deps, release, send } = setup();
    send.mockRejectedValueOnce(new Error('SMTP tạm lỗi'));
    await expect(new ReportAlertService(deps).check()).rejects.toThrow('SMTP tạm lỗi');
    expect(release).toHaveBeenCalledWith('a10:alert:DOWN:facility-a');
  });

  it('không chiếm khóa khi không có người nhận', async () => {
    const { deps, recipients, claim, send } = setup();
    recipients.mockResolvedValueOnce([]);
    expect(await new ReportAlertService(deps).check()).toBe(0);
    expect(claim).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });
});
