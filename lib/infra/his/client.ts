import { AppError } from '@/lib/domain/errors';
import type { HisGateway, HisRequestOptions } from '@/lib/domain/ports';
import { getSecretByRef } from '@/lib/config/env';
import { logger } from '@/lib/infra/logger';
import { CircuitBreaker } from './circuit-breaker';
import { decrypt3DES, encrypt3DES, signHis } from './crypto';
import { mapHisError } from './error-map';

/** Cấu hình kết nối lấy từ bảng facility (C02 mục 2). */
export interface HisConnection {
  facilityId: string;
  code: string;
  apiBaseUrl: string;
  partnerCode: string;
  secretRef: string;
  timeoutMs: number;
}

export type ConnectionLoader = (facilityId: string) => Promise<HisConnection>;

/** Gói trả về của ApiDatKham (DataResponseObject) – chấp nhận cả PascalCase và camelCase. */
interface RawResponse {
  Successful?: boolean;
  successful?: boolean;
  Result?: string;
  result?: string;
  ErrorCode?: string;
  errorCode?: string;
  ErrorMessage?: string;
  errorMessage?: string;
}

/**
 * Cửa duy nhất gọi ApiDatKham (00-CONG-NGHE-QUY-UOC mục 8).
 * POST {apiBaseUrl}/{Controller}/{Action}  body { Data: Base64(3DES(json)), Signature }
 */
export class HisClient implements HisGateway {
  private readonly breaker = new CircuitBreaker();

  constructor(
    private readonly loadConnection: ConnectionLoader,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async call<T>(facilityId: string, path: string, body: unknown, opt?: HisRequestOptions): Promise<T> {
    const conn = await this.loadConnection(facilityId);
    if (this.breaker.isOpen(facilityId)) throw new AppError('HIS_UNAVAILABLE');

    const key = getSecretByRef(conn.secretRef);
    const data = encrypt3DES(JSON.stringify(body ?? {}), key);
    const started = Date.now();
    let res: Response;
    try {
      res = await this.fetchImpl(`${conn.apiBaseUrl.replace(/\/$/, '')}/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Data: data, Signature: signHis(data, conn.partnerCode, key) }),
        signal: AbortSignal.timeout(opt?.timeoutMs ?? conn.timeoutMs),
        cache: 'no-store',
      });
    } catch (err) {
      this.breaker.record(facilityId, false);
      logger.warn(
        { facility: conn.code, path, ms: Date.now() - started, err: (err as Error).name },
        'his.network',
      );
      throw new AppError('HIS_UNAVAILABLE');
    }

    this.breaker.record(facilityId, res.status < 500);
    logger.debug({ facility: conn.code, path, status: res.status, ms: Date.now() - started }, 'his.call');
    if (res.status === 404) throw new AppError('NOT_FOUND'); // ApiDatKham trả 404 khi danh sách rỗng
    if (!res.ok) throw new AppError('HIS_ERROR', undefined, { status: res.status });

    const raw = (await res.json()) as RawResponse;
    const ok = raw.Successful ?? raw.successful ?? false;
    const result = raw.Result ?? raw.result;
    if (!ok || !result) {
      const hisCode = raw.ErrorCode ?? raw.errorCode;
      throw new AppError(mapHisError(hisCode), undefined, { hisCode });
    }
    // Không log nội dung trả về (có dữ liệu cá nhân)
    return JSON.parse(decrypt3DES(result, key)) as T;
  }
}
