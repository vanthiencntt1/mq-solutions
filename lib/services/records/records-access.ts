import { AppError } from '@/lib/domain/errors';
import type { RecordsDeps } from '@/lib/domain/records/ports';
import type { RecordContext } from './records-data';

const VIEW_LIMIT = 60;

/** C04: ranh giới quyền xem, giới hạn tần suất và nhật ký cho mọi lượt đọc. */
export class RecordsAccess {
  constructor(
    private readonly d: Pick<RecordsDeps, 'facilities' | 'identity' | 'limiter' | 'audit' | 'pii'>,
  ) {}

  async context(accountId: string, code: string, ipHash?: string): Promise<RecordContext> {
    const facility = await this.d.facilities.findByCode(code);
    if (!facility || facility.status === 'INACTIVE') throw new AppError('NOT_FOUND', 'Không tìm thấy cơ sở');
    if (facility.status === 'PAUSED') throw new AppError('FACILITY_PAUSED');
    const ident = await this.d.identity.resolve(accountId, facility.code);
    if (ident.status === 'MISMATCH') throw new AppError('IDENTITY_MISMATCH');
    if (ident.status !== 'FOUND' || !ident.maBN) throw new AppError('IDENTITY_NOT_FOUND');
    return { accountId, code: facility.code, facilityId: facility.id, maBN: ident.maBN, ipHash };
  }

  async limit(ctx: RecordContext): Promise<void> {
    const hit = await this.d.limiter.hit(`record:${ctx.accountId}:${ctx.code}`, VIEW_LIMIT, 60);
    if (!hit.allowed) throw new AppError('RATE_LIMITED');
    if (ctx.ipHash) {
      const ipHit = await this.d.limiter.hit(`record:ip:${ctx.ipHash}`, 120, 60);
      if (!ipHit.allowed) throw new AppError('RATE_LIMITED');
    }
  }

  async audit(ctx: RecordContext, kind: string): Promise<void> {
    await this.d.audit.write({
      actorType: 'PATIENT',
      actorId: ctx.accountId,
      action: 'VIEW_RECORD',
      module: 'records',
      target: this.d.pii.hmac(`${ctx.code}:${ctx.maBN}`).slice(0, 16),
      diff: { facility: ctx.code, kind },
      ipHash: ctx.ipHash,
    });
  }
}
