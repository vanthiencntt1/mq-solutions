import { Queue, Worker } from 'bullmq';
import { logger } from '@/lib/infra/logger';
import { getRedis } from '@/lib/infra/redis/client';
import { PROCESSORS } from './jobs';
import { QUEUES, REPEATS } from './queues';

// Entry tiến trình worker (container `worker`, lệnh: pnpm worker).
async function main() {
  const connection = getRedis();

  for (const r of REPEATS) {
    const q = new Queue(r.queue, { connection });
    await q.upsertJobScheduler(r.name, { pattern: r.pattern, tz: 'Asia/Ho_Chi_Minh' }, { name: r.name });
  }

  const workers = Object.values(QUEUES).map((name) =>
    new Worker(name, PROCESSORS[name], { connection, concurrency: name === QUEUES.email ? 5 : 1 }).on(
      'failed',
      (job, err) => logger.error({ queue: name, job: job?.name, err: err.message }, 'worker.failed'),
    ),
  );

  logger.info({ queues: Object.values(QUEUES) }, 'worker.started');

  const shutdown = async () => {
    await Promise.all(workers.map((w) => w.close()));
    await connection.quit();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  logger.fatal({ err }, 'worker.crashed');
  process.exit(1);
});
