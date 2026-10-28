import { AppError } from '@/lib/domain/errors';
import type { ReportType } from '@/lib/domain/records/report-types';
import { getAuthService } from '@/lib/services/auth';
import { getActiveFacilityByCode } from '@/lib/services/facility-service';
import { getRecordsService } from './index';
import { buildReports, pickReport } from './report-builder';

export async function getMedicalReport(
  accountId: string,
  code: string,
  id: string,
  type: ReportType,
  ipHash?: string,
) {
  const detail = await getRecordsService().encounter(accountId, code, id, ipHash);
  const [facility, account] = await Promise.all([
    getActiveFacilityByCode(code),
    getAuthService().getReportProfile(accountId),
  ]);
  if (!facility) throw new AppError('NOT_FOUND', 'Không tìm thấy cơ sở');
  return pickReport(buildReports(detail, facility, account), type);
}
