import { prismaSettingsRepository } from '@/lib/infra/db/settings-repository';
import { cacheKeys, CACHE_TTL, redisCache } from '@/lib/infra/redis/client';
import { getEnv } from '@/lib/config/env';
import { SettingsService } from './settings-service';

let instance: SettingsService | undefined;

export function getSettingsService(): SettingsService {
  instance ??= new SettingsService(
    prismaSettingsRepository,
    redisCache,
    cacheKeys.settingsAll(),
    CACHE_TTL.settings,
  );
  return instance;
}

/** A11: chỉ xuất các khóa an toàn để layout/trang công khai dùng sau. */
export async function getPublicSettings() {
  return getSettingsService().publicSettings();
}

export function getSettingsSecretStatus() {
  const env = getEnv();
  return { smtpCredentialsConfigured: Boolean(env.SMTP_USER && env.SMTP_PASSWORD) };
}

export { SettingsService } from './settings-service';
export type { SettingKey, Settings } from './schemas';
