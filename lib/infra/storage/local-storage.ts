import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '@/lib/domain/errors';
import type { Storage, StoredFile } from '@/lib/domain/ports';

// Lưu tệp ngay trên ổ đĩa server (thay MinIO / S3 – đơn giản cho giai đoạn đầu).
//   <STORAGE_DIR>/public/<yyyy>/<mm>/<uuid>.<ext>   → /uploads/<yyyy>/<mm>/<uuid>.<ext>
//   <STORAGE_DIR>/private/...                         → không phục vụ ra ngoài

export const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'application/pdf': 'pdf',
};

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // khớp client_max_body_size của nginx
export const PUBLIC_URL_PREFIX = '/uploads';

export function storageRoot(): string {
  return path.resolve(process.env.STORAGE_DIR ?? './storage');
}

/** Ghép đường dẫn an toàn, chặn ../ thoát khỏi thư mục lưu. */
export function resolveSafe(visibility: 'public' | 'private', key: string): string {
  const base = path.join(storageRoot(), visibility);
  const full = path.resolve(base, key);
  if (!full.startsWith(base + path.sep)) throw new AppError('BAD_REQUEST', 'Đường dẫn tệp không hợp lệ');
  return full;
}

export class LocalStorage implements Storage {
  async save({
    data,
    mime,
    visibility,
  }: {
    data: Buffer;
    mime: string;
    visibility: 'public' | 'private';
  }): Promise<StoredFile> {
    const ext = ALLOWED_MIME[mime];
    if (!ext) throw new AppError('VALIDATION_FAILED', 'Định dạng tệp không được hỗ trợ');
    if (data.length > MAX_UPLOAD_BYTES) throw new AppError('VALIDATION_FAILED', 'Tệp vượt quá 10 MB');
    const now = new Date();
    const key = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${randomUUID()}.${ext}`;
    const full = resolveSafe(visibility, key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data, { flag: 'wx' });
    return {
      key,
      url: visibility === 'public' ? `${PUBLIC_URL_PREFIX}/${key}` : '',
      size: data.length,
      mime,
    };
  }

  async read(key: string, visibility: 'public' | 'private'): Promise<Buffer> {
    return readFile(resolveSafe(visibility, key));
  }

  async remove(key: string, visibility: 'public' | 'private'): Promise<void> {
    await rm(resolveSafe(visibility, key), { force: true });
  }
}

export const storage = new LocalStorage();
