import { prismaReportRepository } from '@/lib/infra/db/report-repository';
import { prisma } from '@/lib/infra/db/prisma';
import { prismaReportAlerts } from '@/lib/infra/db/report-alerts';
import { smtpMailer } from '@/lib/infra/mail/smtp-mailer';
import { getRedis, redisCache } from '@/lib/infra/redis/client';
import { ReportAlertService } from './alert-service';
import { ReportService } from './report-service';
import { getNavCounts } from './nav-counts';
import type { AdminPrincipal } from '@/lib/services/admin-auth';

let instance: ReportService | undefined;

export function getReportService(): ReportService {
  instance ??= new ReportService({ repo: prismaReportRepository, cache: redisCache, now: () => new Date() });
  return instance;
}

export function getAdminNavCounts(actor: AdminPrincipal) {
  return getNavCounts(actor, {
    dashboard: (user) => getReportService().dashboard(user),
    pendingReviews: (scope) => prisma.review.count({
      where: { status: 'PENDING', ...(scope === null ? {} : { facilityId: { in: scope } }) },
    }),
    cache: redisCache,
  });
}

let alerts: ReportAlertService | undefined;

export function getReportAlertService(): ReportAlertService {
  alerts ??= new ReportAlertService({
    repo: prismaReportAlerts,
    mailer: smtpMailer,
    claim: async (key, ttl) => (await getRedis().set(key, '1', 'EX', ttl, 'NX')) === 'OK',
    release: async (key) => {
      await getRedis().del(key);
    },
    now: () => new Date(),
  });
  return alerts;
}
