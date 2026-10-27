import { AppError } from '@/lib/domain/errors';

/** C08 mục 4: giờ chốt theo ngày khám tại Việt Nam, ví dụ D-1 15:00. */
export function cancellationDeadline(examDate: string, rule: string): Date {
  const match = /^D-(\d{1,2}) ([01]\d|2[0-3]):([0-5]\d)$/.exec(rule);
  if (!match || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw new AppError('CANCEL_POLICY_INVALID');
  const day = new Date(`${examDate}T00:00:00.000Z`);
  if (Number.isNaN(day.getTime()) || day.toISOString().slice(0, 10) !== examDate)
    throw new AppError('CANCEL_POLICY_INVALID');
  day.setUTCDate(day.getUTCDate() - Number(match[1]));
  day.setUTCHours(Number(match[2]) - 7, Number(match[3]), 0, 0);
  return day;
}

export function canSelfCancel(examDate: string, rule: string, now: Date): boolean {
  return now.getTime() < cancellationDeadline(examDate, rule).getTime();
}
