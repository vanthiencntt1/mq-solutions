import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LocalStorage, resolveSafe } from '@/lib/infra/storage/local-storage';
import { readPublicUpload } from '@/lib/services/upload-service';

let dir = '';
beforeAll(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'mq-storage-'));
  process.env.STORAGE_DIR = dir;
});
afterAll(() => rm(dir, { recursive: true, force: true }));

describe('lưu tệp trên ổ đĩa server', () => {
  it('lưu ảnh công khai rồi đọc lại qua /uploads', async () => {
    const s = new LocalStorage();
    const f = await s.save({ data: Buffer.from('png-bytes'), mime: 'image/png', visibility: 'public' });
    expect(f.url).toMatch(/^\/uploads\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    const out = await readPublicUpload(f.key.split('/'));
    expect(out.mime).toBe('image/png');
    expect(out.data.toString()).toBe('png-bytes');
  });

  it('chặn định dạng lạ và đường dẫn ../', async () => {
    const s = new LocalStorage();
    await expect(
      s.save({ data: Buffer.from('x'), mime: 'text/html', visibility: 'public' }),
    ).rejects.toThrow();
    expect(() => resolveSafe('public', '../private/a.png')).toThrow();
    await expect(readPublicUpload(['..', 'private', 'a.png'])).rejects.toThrow();
  });

  it('tệp private không trả URL công khai', async () => {
    const f = await new LocalStorage().save({
      data: Buffer.from('%PDF'),
      mime: 'application/pdf',
      visibility: 'private',
    });
    expect(f.url).toBe('');
  });
});
