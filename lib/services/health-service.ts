import { prisma } from '@/lib/infra/db/prisma';
import { getRedis } from '@/lib/infra/redis/client';

export interface HealthReport {
  ok: boolean;
  db: 'ok' | 'down';
  redis: 'ok' | 'down';
  version: string;
}

export async function checkHealth(): Promise<HealthReport> {
  const [db, redis] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(
      () => 'ok' as const,
      () => 'down' as const,
    ),
    getRedis()
      .ping()
      .then(
        () => 'ok' as const,
        () => 'down' as const,
      ),
  ]);
  return { ok: db === 'ok' && redis === 'ok', db, redis, version: process.env.APP_VERSION ?? 'dev' };
}
