import { getEnv } from '@/lib/config/env';
import { getSettingsService } from '@/lib/services/settings';
import { AnalyticsService } from './analytics-service';

export function getAnalyticsService(): AnalyticsService {
  return new AnalyticsService(getSettingsService(), getEnv().UMAMI_ORIGIN);
}
