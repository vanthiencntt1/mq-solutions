import { z, type ZodType } from 'zod';
import { AppError } from '@/lib/domain/errors';
import type { RecordsDeps } from '@/lib/domain/records/ports';

const HIS_TIMEOUT_MS = 10_000;
const FILE_TTL_SECONDS = 5 * 60;
export const RECORDS_TTL_SECONDS = 30 * 60;

export type RecordKind = 'encounters' | 'tests' | 'imaging' | 'prescriptions' | 'reexams';
export type RecordContext = {
  accountId: string;
  code: string;
  facilityId: string;
  maBN: string;
  ipHash?: string;
};

const FilePayload = z.object({
  accountId: z.string(),
  code: z.string(),
  maBN: z.string(),
  mime: z.enum(['application/pdf', 'image/png', 'image/jpeg']),
  base64: z.string(),
});

/** Đọc HIS và cache mã hóa. Tách hạ tầng dữ liệu khỏi điều phối quyền xem của RecordsService (C04). */
export class RecordsData {
  constructor(private readonly d: Pick<RecordsDeps, 'his' | 'cache' | 'pii' | 'token'>) {}

  async call<T>(ctx: RecordContext, path: string, body: unknown, schema: ZodType<T>): Promise<T> {
    let raw: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        raw = await this.d.his.call<unknown>(ctx.facilityId, path, body, { timeoutMs: HIS_TIMEOUT_MS });
        break;
      } catch (err) {
        if (err instanceof AppError && err.code === 'NOT_FOUND') return schema.parse([]);
        // API đọc được thử lại đúng một lần theo 00-CONG-NGHE-QUY-UOC mục 8.
        if (
          attempt === 1 ||
          !(err instanceof AppError && ['HIS_UNAVAILABLE', 'HIS_ERROR'].includes(err.code))
        )
          throw err;
      }
    }
    const parsed = schema.safeParse(raw);
    if (!parsed.success) throw new AppError('RECORD_DATA_INVALID');
    return parsed.data;
  }

  async cached<T>(
    ctx: RecordContext,
    kind: RecordKind,
    suffix: string,
    schema: ZodType<T>,
    fetch: () => Promise<T>,
  ): Promise<T> {
    const key = `record:${ctx.accountId}:${ctx.code}:${this.d.pii.hmac(ctx.maBN).slice(0, 16)}:${kind}:${suffix}`;
    const encrypted = await this.d.cache.get<string>(key);
    if (encrypted) {
      const parsed = schema.safeParse(JSON.parse(this.d.pii.decrypt(encrypted)) as unknown);
      if (parsed.success) return parsed.data;
      await this.d.cache.del(key);
    }
    const data = await fetch();
    await this.d.cache.set(key, this.d.pii.encrypt(JSON.stringify(data)), RECORDS_TTL_SECONDS);
    return data;
  }

  async filePayload(token: string): Promise<z.infer<typeof FilePayload>> {
    const match = /^([0-9a-f-]{36})\.([0-9a-f]{32})$/.exec(token);
    if (!match || this.d.pii.hmac(`file:${match[1]}`).slice(0, 32) !== match[2])
      throw new AppError('RECORD_FILE_EXPIRED');
    const encrypted = await this.d.cache.get<string>(`record:file:${token}`);
    if (!encrypted) throw new AppError('RECORD_FILE_EXPIRED');
    const parsed = FilePayload.safeParse(JSON.parse(this.d.pii.decrypt(encrypted)) as unknown);
    if (!parsed.success) throw new AppError('RECORD_FILE_EXPIRED');
    return parsed.data;
  }

  async fileLink(ctx: RecordContext, base64: string): Promise<string | undefined> {
    if (!base64 || base64.length > 7_000_000 || !/^[A-Za-z0-9+/=]+$/.test(base64)) return undefined;
    const data = Buffer.from(base64, 'base64');
    const mime =
      data.subarray(0, 4).toString() === '%PDF'
        ? 'application/pdf'
        : data.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))
          ? 'image/png'
          : data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
            ? 'image/jpeg'
            : undefined;
    if (!mime) return undefined;
    const uuid = this.d.token();
    const token = `${uuid}.${this.d.pii.hmac(`file:${uuid}`).slice(0, 32)}`;
    await this.d.cache.set(
      `record:file:${token}`,
      this.d.pii.encrypt(
        JSON.stringify({
          accountId: ctx.accountId,
          code: ctx.code,
          maBN: ctx.maBN,
          mime,
          base64,
        }),
      ),
      FILE_TTL_SECONDS,
    );
    return `/api/files/${token}`;
  }
}
