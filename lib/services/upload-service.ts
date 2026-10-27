import { AppError } from '@/lib/domain/errors';
import { ALLOWED_MIME, PUBLIC_URL_PREFIX, resolveSafe } from '@/lib/infra/storage/local-storage';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Đọc tệp công khai để trả về trình duyệt (dev / khi không có nginx phía trước).
export async function readPublicUpload(segments: string[]): Promise<{ data: Buffer; mime: string }> {
  const key = segments.join('/');
  const ext = path.extname(key).slice(1).toLowerCase();
  const mime = Object.entries(ALLOWED_MIME).find(
    ([, e]) => e === ext || (ext === 'jpeg' && e === 'jpg'),
  )?.[0];
  if (!mime) throw new AppError('NOT_FOUND');
  try {
    return { data: await readFile(resolveSafe('public', key)), mime };
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('NOT_FOUND');
  }
}

export const uploadUrl = (key: string) => `${PUBLIC_URL_PREFIX}/${key}`;
