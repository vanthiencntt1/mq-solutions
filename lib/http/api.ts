import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';
import { AppError, isAppError } from '@/lib/domain/errors';
import { logger } from '@/lib/infra/logger';

// Định dạng phản hồi API nội bộ (00-CONG-NGHE-QUY-UOC mục 6).

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export function ok<T>(data: T, meta?: PageMeta, init?: ResponseInit) {
  return NextResponse.json(meta ? { data, meta } : { data }, init);
}

export function fail(err: AppError) {
  // Zod issue có thể chứa input hoặc path do người dùng tạo; client chỉ cần thông báo chung.
  const details = err.code === 'VALIDATION_FAILED' && Array.isArray(err.details) ? undefined : err.details;
  return NextResponse.json(
    { error: { code: err.code, message: err.message, ...(details ? { details } : {}) } },
    { status: err.status },
  );
}

export function parseWith<T>(schema: ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new AppError('VALIDATION_FAILED', undefined, r.error.issues);
  return r.data;
}

type Handler<C> = (req: Request, ctx: C) => Promise<Response>;

/** Bọc Route Handler: kiểm Origin cho request ghi, bắt AppError / ZodError, không lộ lỗi nội bộ. */
export function route<C = unknown>(handler: Handler<C>): Handler<C> {
  return async (req, ctx) => {
    try {
      if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (err) {
      if (isAppError(err)) return fail(err);
      if (err instanceof ZodError) return fail(new AppError('VALIDATION_FAILED', undefined, err.issues));
      logger.error({ err, path: new URL(req.url).pathname }, 'api.unhandled');
      return fail(new AppError('INTERNAL'));
    }
  };
}

function assertSameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return; // server-to-server (webhook) – webhook tự kiểm khóa riêng
  try {
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin === origin && parsedOrigin.origin === new URL(req.url).origin) return;
  } catch {
    // Origin không phải URL hợp lệ cũng là yêu cầu khác nguồn.
  }
  throw new AppError('FORBIDDEN', 'Origin không hợp lệ');
}
