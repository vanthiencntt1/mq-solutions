import pino from 'pino';

// C10 mục 2: chặn cả khóa lồng sâu và payload HIS (Data/Result) trước khi Pino serialize.
const SENSITIVE_KEYS = new Set([
  'cccd',
  'cccdenc',
  'phone',
  'phonehmac',
  'mobile',
  'fullname',
  'hoten',
  'email',
  'mabn',
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'secretref',
  'key',
  'err',
  'error',
  'body',
  'headers',
  'diagnosis',
  'chandoan',
  'medicine',
  'thuoc',
  'data',
  'result',
]);

export function redactLogValue(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value instanceof Error) return { name: value.name, message: '[ẩn]' };
  if (typeof value === 'string')
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[ẩn]')
      .replace(/\b\d{12}\b/g, '[ẩn]')
      .replace(/\b0\d{9}\b/g, '[ẩn]');
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    if (seen.has(value)) return '[vòng lặp]';
    seen.add(value);
    if (Array.isArray(value)) {
      const safe = value.map((item) => redactLogValue(item, seen));
      seen.delete(value);
      return safe;
    }
    const safe: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value)) {
      safe[key] = SENSITIVE_KEYS.has(key.replace(/[-_]/g, '').toLowerCase())
        ? '[ẩn]'
        : redactLogValue(item, seen);
    }
    seen.delete(value);
    return safe;
  }
  return value;
}

export function createLogger(destination?: pino.DestinationStream) {
  const options: pino.LoggerOptions = {
    level: process.env.LOG_LEVEL ?? 'info',
    base: { app: 'mq-solutions' },
    hooks: {
      // Child bindings được Pino serialize trước logMethod, nên lọc ở bước JSON cuối cùng.
      streamWrite(line) {
        try {
          return `${JSON.stringify(redactLogValue(JSON.parse(line)))}\n`;
        } catch {
          return '{"msg":"[ẩn: log không hợp lệ]"}\n';
        }
      },
    },
  };
  return destination ? pino(options, destination) : pino(options);
}

export const logger = createLogger();
