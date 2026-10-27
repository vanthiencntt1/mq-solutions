import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import type { FacilityDeps, FacilityRow } from '@/lib/domain/admin/facility-ports';
import type {
  FacilityCreateInput,
  FacilityListInput,
  FacilityUpdateInput,
} from '@/lib/domain/admin/facility-schemas';

type Health = 'OK' | 'DEGRADED' | 'DOWN';
const subjects = z.array(z.object({ id: z.union([z.string(), z.number()]), name: z.string() }));
const doctors = z.array(z.object({ id: z.union([z.string(), z.number()]) }).passthrough());

function hasPermission(
  actor: AdminPrincipal,
  permission: typeof PERMISSIONS.FACILITY_READ | typeof PERMISSIONS.FACILITY_UPDATE,
): void {
  if (!can({ name: actor.role, permissions: actor.permissions }, permission)) throw new AppError('FORBIDDEN');
}

function scoped(actor: AdminPrincipal, id: string): void {
  if (actor.facilityIds !== null && !actor.facilityIds.includes(id)) throw new AppError('FORBIDDEN');
}

function publicRow(row: FacilityRow, envHas: (ref: string) => boolean) {
  return {
    ...row,
    secretAvailable: envHas(row.secretRef),
    webhookKeyAvailable: row.webhookKeyRef ? envHas(row.webhookKeyRef) : false,
  };
}

// A02 mục 3: diff chỉ gồm trường đã đổi; audit tránh ghi mật khẩu và số tài khoản đầy đủ.
function changesOf(before: FacilityRow, input: Omit<FacilityUpdateInput, 'confirmPassword'>) {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, to] of Object.entries(input)) {
    if (to === undefined) continue;
    const from = before[key as keyof FacilityRow];
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changes[key] =
        key === 'bankAccountNo' ? { from: from ? '***' : null, to: to ? '***' : null } : { from, to };
    }
  }
  return changes;
}

export class AdminFacilityService {
  constructor(private readonly d: FacilityDeps) {}

  async list(actor: AdminPrincipal, query: FacilityListInput) {
    hasPermission(actor, PERMISSIONS.FACILITY_READ);
    const result = await this.d.repo.list(query, actor.facilityIds);
    return { rows: result.rows.map((row) => publicRow(row, this.d.envHas)), total: result.total };
  }

  async get(actor: AdminPrincipal, id: string) {
    hasPermission(actor, PERMISSIONS.FACILITY_READ);
    scoped(actor, id);
    const row = await this.d.repo.find(id);
    if (!row) throw new AppError('NOT_FOUND');
    return publicRow(row, this.d.envHas);
  }

  async create(actor: AdminPrincipal, input: FacilityCreateInput) {
    hasPermission(actor, PERMISSIONS.FACILITY_UPDATE);
    if (actor.facilityIds !== null) throw new AppError('FORBIDDEN');
    if (await this.d.repo.exists(input.code, input.slug)) throw new AppError('FACILITY_EXISTS');
    const row = await this.d.repo.create(input, actor.id);
    return publicRow(row, this.d.envHas);
  }

  async update(actor: AdminPrincipal, id: string, input: FacilityUpdateInput) {
    hasPermission(actor, PERMISSIONS.FACILITY_UPDATE);
    scoped(actor, id);
    const before = await this.d.repo.find(id);
    if (!before) throw new AppError('NOT_FOUND');
    const { confirmPassword, ...changes } = input;
    const diff = changesOf(before, changes);
    if (!Object.keys(diff).length) return publicRow(before, this.d.envHas);
    if (['apiBaseUrl', 'secretRef', 'bankAccountNo'].some((key) => key in diff))
      await this.confirmPassword(actor.id, confirmPassword);
    const connectionChanged = ['apiBaseUrl', 'secretRef', 'partnerCode', 'timeoutMs'].some(
      (key) => key in diff,
    );
    if (connectionChanged) diff.health = { from: before.health, to: 'UNKNOWN' };
    const row = await this.d.repo.update(
      id,
      connectionChanged ? { ...changes, health: 'UNKNOWN' } : changes,
      actor.id,
      diff,
    );
    if (connectionChanged) this.d.invalidateConnection(id);
    return publicRow(row, this.d.envHas);
  }

  async changeStatus(actor: AdminPrincipal, id: string, status: FacilityRow['status']) {
    hasPermission(actor, PERMISSIONS.FACILITY_UPDATE);
    scoped(actor, id);
    const before = await this.d.repo.find(id);
    if (!before) throw new AppError('NOT_FOUND');
    if (before.status === status) return publicRow(before, this.d.envHas);
    if (status === 'ACTIVE' && before.health !== 'OK') throw new AppError('FACILITY_HEALTH_REQUIRED');
    const row = await this.d.repo.update(id, { status }, actor.id, {
      status: { from: before.status, to: status },
    });
    this.d.invalidateConnection(id);
    return publicRow(row, this.d.envHas);
  }

  async checkConnection(actor: AdminPrincipal, id: string) {
    hasPermission(actor, PERMISSIONS.FACILITY_UPDATE);
    scoped(actor, id);
    return this.probe(id);
  }

  async probe(
    id: string,
  ): Promise<{ health: Health; durationMs: number; lastOkAt: Date | null; message: string }> {
    const before = await this.d.repo.find(id);
    if (!before) throw new AppError('NOT_FOUND');
    const started = this.d.elapsed();
    let health: Health = 'OK';
    let message = 'Kết nối thành công';
    try {
      subjects.parse(await this.d.his.call<unknown>(id, 'Subjects/GetSubjects', {}));
      if (before.bookingMode !== 'SPECIALTY')
        doctors.parse(await this.d.his.call<unknown>(id, 'Doctors/GetDoctors', {}));
    } catch (error) {
      health = error instanceof z.ZodError ? 'DEGRADED' : 'DOWN';
      message = health === 'DEGRADED' ? 'Phản hồi HIS không đúng định dạng' : 'Không kết nối được ApiDatKham';
    }
    const durationMs = Math.max(0, Math.round(this.d.elapsed() - started));
    const lastOkAt = health === 'OK' ? this.d.now() : before.lastOkAt;
    await this.d.repo.recordHealth(
      id,
      health,
      health === 'OK' ? lastOkAt : null,
      durationMs,
      health === 'OK' ? undefined : message,
    );
    return { health, durationMs, lastOkAt, message };
  }

  async checkAll(): Promise<void> {
    const ids = await this.d.repo.activeIds();
    // allSettled: 1 cơ sở lỗi không làm dừng kiểm tra các cơ sở còn lại
    let failed = 0;
    for (let i = 0; i < ids.length; i += 10) {
      const results = await Promise.allSettled(ids.slice(i, i + 10).map((id) => this.probe(id)));
      failed += results.filter((r) => r.status === 'rejected').length;
    }
    if (failed > 0) throw new Error(`Health-check lỗi ở ${failed}/${ids.length} cơ sở`);
  }

  async clearCache(actor: AdminPrincipal, id: string) {
    hasPermission(actor, PERMISSIONS.FACILITY_UPDATE);
    scoped(actor, id);
    const row = await this.d.repo.find(id);
    if (!row) throw new AppError('NOT_FOUND');
    return { deleted: await this.d.clearCache(row.code) };
  }

  async upload(actor: AdminPrincipal, id: string, kind: 'logo' | 'image', data: Buffer, mime: string) {
    hasPermission(actor, PERMISSIONS.FACILITY_UPDATE);
    scoped(actor, id);
    const row = await this.d.repo.find(id);
    if (!row) throw new AppError('NOT_FOUND');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime) || data.length > 10 * 1024 * 1024)
      throw new AppError('FACILITY_IMAGE_INVALID');
    if (kind === 'image' && row.images.length >= 12) throw new AppError('FACILITY_IMAGE_INVALID');
    const file = await this.d.storage.save({ data, mime, visibility: 'public' });
    const changes = kind === 'logo' ? { logoUrl: file.url } : { images: [...row.images, file.url] };
    await this.d.repo.update(id, changes, actor.id, changesOf(row, changes));
    return { url: file.url };
  }

  private async confirmPassword(actorId: string, password: string | undefined): Promise<void> {
    const hash = await this.d.repo.passwordHash(actorId);
    if (!password || !hash || !(await this.d.verifyPassword(hash, password)))
      throw new AppError('ADMIN_WRONG_PASSWORD');
  }
}
