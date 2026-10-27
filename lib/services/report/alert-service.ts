import type { Mailer } from '@/lib/domain/ports';

export type AlertCandidate = {
  kind: 'DOWN' | 'HIS_STALE' | 'RECONCILE_FAILED';
  facilityId: string;
  facilityName: string;
  detail: string;
};

export interface AlertRepository {
  candidates(now: Date): Promise<AlertCandidate[]>;
  recipients(facilityId: string): Promise<string[]>;
}

export interface AlertDeps {
  repo: AlertRepository;
  mailer: Mailer;
  claim(key: string, ttl: number): Promise<boolean>;
  release(key: string): Promise<void>;
  now(): Date;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char,
  );
}

export class ReportAlertService {
  constructor(private readonly d: AlertDeps) {}

  async check(): Promise<number> {
    const alerts = await this.d.repo.candidates(this.d.now());
    let sent = 0;
    for (const alert of alerts) {
      const key = `a10:alert:${alert.kind}:${alert.facilityId}`;
      const recipients = await this.d.repo.recipients(alert.facilityId);
      if (recipients.length === 0 || !(await this.d.claim(key, 3600))) continue;
      let delivered = false;
      try {
        for (const to of recipients) {
          await this.d.mailer.send({
            to,
            subject: `[MQ] Cảnh báo ${alert.kind} · ${alert.facilityName}`,
            html: `<p>Cơ sở: <strong>${escapeHtml(alert.facilityName)}</strong></p><p>${escapeHtml(alert.detail)}</p><p>Vui lòng kiểm tra trang quản trị.</p>`,
          });
          delivered = true;
          sent++;
        }
      } catch (error) {
        // A10 mục 3: nếu SMTP chưa gửi được thư nào, nhường job sau thử lại.
        if (!delivered) await this.d.release(key);
        throw error;
      }
    }
    return sent;
  }
}
