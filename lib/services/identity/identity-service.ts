import { AppError } from '@/lib/domain/errors';
import type { FacilityRef, IdentityDeps } from '@/lib/domain/identity/ports';
import {
  filterMatching,
  recentMmyy,
  toFound,
  type HisPatient,
  type IdentResult,
} from '@/lib/domain/identity/types';
import { maskMaBN } from '@/lib/utils/format';

// Định danh bệnh nhân theo cơ sở – core/C03. Không lưu liên kết vào DB: kết quả chỉ ở Redis 30 phút.

export const IDENT_TTL_SECONDS = 30 * 60;
const VISIT_LOOKBACK_MONTHS = 6;
const BY_MABN_LIMIT = 5; // lần / giờ / tài khoản (C03 mục 4 bước 5)

/** Dạng trả về trình duyệt: không có MaBN đầy đủ (C03 mục 7). */
export interface IdentView {
  status: IdentResult['status'] | 'UNAVAILABLE';
  maBNMasked?: string;
  hasVisited?: boolean;
  checkedAt?: string;
}

/**
 * Lần khám mới nhất dạng số yyyymmddhhmm từ CreateDate "dd/mm/yyyy hh:mm".
 * Dòng thiếu ngày: lấy đầu tháng của MMyy đã tra (hoặc 1 nếu tra toàn bộ) để vẫn tính là đã khám.
 */
function latestVisit(rows: unknown[], mmyy: string): number {
  if (rows.length === 0) return 0;
  const fallback = mmyy ? Number(`20${mmyy.slice(2)}${mmyy.slice(0, 2)}000000`) : 1;
  return Math.max(
    ...rows.map((r) => {
      const m = /^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?/.exec(
        String((r as { CreateDate?: unknown })?.CreateDate ?? ''),
      );
      return m ? Number(`${m[3]}${m[2]}${m[1]}${m[4] ?? '00'}${m[5] ?? '00'}`) : fallback;
    }),
  );
}

/** Khóa cache: ident:{accountId}:{facilityCode} (C09 mục 2). */
const identKey = (accountId: string, facilityCode: string) => `ident:${accountId}:${facilityCode}`;

interface RawPatient {
  id?: string | number;
  surname?: string | null;
  name?: string | null;
  birthyear?: string | number | null;
  sex?: string | number | null;
  mobile?: string | null;
  social_id?: string | null;
}

/** ApiDatKham trả kiểu lỏng (số lẫn chuỗi) → chuẩn hóa một chỗ. */
function toHisPatient(r: RawPatient): HisPatient | null {
  if (r.id === undefined || r.id === null || String(r.id).trim() === '') return null;
  const year = Number(r.birthyear);
  const sex = r.sex === null || r.sex === undefined || r.sex === '' ? null : Number(r.sex);
  return {
    id: String(r.id).trim(),
    surname: (r.surname ?? '').trim(),
    name: (r.name ?? '').trim(),
    birthYear: Number.isInteger(year) && year > 1800 ? year : null,
    sex: sex !== null && Number.isFinite(sex) ? sex : null,
    mobile: r.mobile?.trim() || null,
    socialId: r.social_id?.trim() || null,
  };
}

const isHisDown = (err: unknown) =>
  err instanceof AppError && (err.code === 'HIS_UNAVAILABLE' || err.code === 'HIS_ERROR');

export class IdentityService {
  constructor(private readonly d: IdentityDeps) {}

  /** Kết quả định danh (đã che MaBN) cho trình duyệt. `refresh` = bấm "Tải lại". */
  async identify(
    accountId: string,
    facilityCode: string,
    opts: { refresh?: boolean; ipHash?: string } = {},
  ): Promise<IdentView> {
    try {
      return this.toView(await this.resolve(accountId, facilityCode, opts));
    } catch (err) {
      if (isHisDown(err)) return { status: 'UNAVAILABLE' };
      throw err;
    }
  }

  /**
   * Dùng nội bộ bởi hồ sơ bệnh án / đặt khám: trả kết quả đầy đủ (có MaBN) từ cache, hết hạn thì gọi lại HIS.
   * MaBN luôn lấy ở đây, không nhận từ client (00-CONG-NGHE-QUY-UOC mục 9).
   */
  async resolve(
    accountId: string,
    facilityCode: string,
    opts: { refresh?: boolean; ipHash?: string } = {},
  ): Promise<IdentResult> {
    const facility = await this.requireFacility(facilityCode);
    const key = identKey(accountId, facility.code);
    if (opts.refresh) {
      await this.limit(`ident:refresh:${accountId}`, 10, 60);
    } else {
      const hit = await this.d.cache.get<IdentResult>(key);
      if (hit) return hit;
    }

    // Lỗi HIS ném ra từ lookup nên không bao giờ bị cache; MISMATCH được cache để khỏi dò lại liên tục
    const result = await this.lookup(accountId, facility);
    await this.d.cache.set(key, result, IDENT_TTL_SECONDS);
    await this.audit(accountId, facility, result.maBN, opts.ipHash);
    return result;
  }

  /** Bệnh nhân tự nhập MaBN in trên phiếu cũ (C03 mục 4 bước 5). Khớp họ tên + năm sinh mới nhận. */
  async identifyByMaBN(
    accountId: string,
    facilityCode: string,
    maBN: string,
    opts: { ipHash?: string } = {},
  ): Promise<IdentView> {
    const facility = await this.requireFacility(facilityCode);
    await this.limit(`ident:mabn:${accountId}`, BY_MABN_LIMIT, 3600);
    const who = await this.requireAccount(accountId);

    let raw: RawPatient | null = null;
    try {
      raw = await this.d.his.call<RawPatient>(facility.id, 'Patients/GetPatientByID', { ID: maBN });
    } catch (err) {
      if (isHisDown(err)) return { status: 'UNAVAILABLE' };
      if (!(err instanceof AppError && err.code === 'NOT_FOUND')) throw err;
    }
    const patient = raw ? toHisPatient(raw) : null;
    const matched = patient ? filterMatching([patient], who)[0] : undefined;
    // Không lộ HIS có MaBN này hay không: sai MaBN và lệch thông tin cùng trả MISMATCH
    if (!matched) return { status: 'MISMATCH' };

    const result = toFound(matched, await this.hasVisited(facility, matched.id), this.d.now());
    await this.d.cache.set(identKey(accountId, facility.code), result, IDENT_TTL_SECONDS);
    await this.audit(accountId, facility, result.maBN, opts.ipHash);
    return this.toView(result);
  }

  /** Danh sách cơ sở bệnh nhân đã từng đặt khám, để vào nhanh (GET /api/me/facilities). */
  async listMyFacilities(accountId: string) {
    const rows = await this.d.facilities.listBookedBy(accountId);
    return rows.map((f) => ({
      code: f.code,
      slug: f.slug,
      name: f.name,
      lastExamDate: f.lastExamDate.toISOString().slice(0, 10),
    }));
  }

  // ---------- nội bộ ----------

  private async lookup(accountId: string, facility: FacilityRef): Promise<IdentResult> {
    const who = await this.requireAccount(accountId);
    const now = this.d.now();

    // Bước 1: theo CCCD; bước 2 (không có kết quả): theo SĐT
    let found = await this.search(facility.id, { Social_id: who.cccd });
    if (found.length === 0) found = await this.search(facility.id, { mobile: who.phone });
    if (found.length === 0) return { status: 'NEW_PATIENT', checkedAt: now.toISOString() };

    const matched = filterMatching(found, who);
    if (matched.length === 0) return { status: 'MISMATCH', checkedAt: now.toISOString() };

    const best = matched.length === 1 ? matched[0]! : await this.mostRecentlyVisited(facility, matched);
    return toFound(best, await this.hasVisited(facility, best.id), now);
  }

  private async search(facilityId: string, body: { Social_id?: string; mobile?: string }) {
    try {
      const rows = await this.d.his.call<RawPatient[]>(facilityId, 'Patients/getPatientsByMobile', body);
      return (Array.isArray(rows) ? rows : []).flatMap((r) => toHisPatient(r) ?? []);
    } catch (err) {
      if (err instanceof AppError && err.code === 'NOT_FOUND') return []; // ApiDatKham trả 404 khi rỗng
      throw err;
    }
  }

  /**
   * Độ gần của lần khám gần nhất (số yyyymmddhhmm; 0 = chưa từng khám).
   * Gọi GetEncounter 1 lần với MMyy rỗng: ApiDatKham lấy mọi tháng trong btdbn.nam.
   * HIS chưa nâng cấp (không trả gì) thì quét vài tháng gần nhất như trước. Lỗi coi là chưa có lần khám.
   */
  private async visitRecency(facility: FacilityRef, maBN: string): Promise<number> {
    const all = await this.encounterRows(facility, maBN, '');
    if (all.length > 0) return latestVisit(all, '');
    const months = recentMmyy(this.d.now(), VISIT_LOOKBACK_MONTHS);
    const scores = await Promise.all(
      months.map(async (MMyy) => latestVisit(await this.encounterRows(facility, maBN, MMyy), MMyy)),
    );
    return Math.max(0, ...scores);
  }

  private async encounterRows(facility: FacilityRef, maBN: string, MMyy: string) {
    try {
      const rows = await this.d.his.call<unknown[]>(facility.id, 'MedicalRecords/GetEncounter', {
        MMyy,
        PatientCode: maBN,
      });
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }

  private async hasVisited(facility: FacilityRef, maBN: string) {
    return (await this.visitRecency(facility, maBN)) > 0;
  }

  /** Hồ sơ trùng trong HIS: chọn MaBN có lần khám gần nhất; hòa thì lấy MaBN đầu (C03 mục 4). */
  private async mostRecentlyVisited(facility: FacilityRef, list: HisPatient[]) {
    const scores = await Promise.all(list.map((p) => this.visitRecency(facility, p.id)));
    let bestIdx = 0;
    scores.forEach((s, i) => {
      if (s > scores[bestIdx]!) bestIdx = i;
    });
    return list[bestIdx]!;
  }

  private toView(r: IdentResult): IdentView {
    return {
      status: r.status,
      ...(r.maBN ? { maBNMasked: maskMaBN(r.maBN) } : {}),
      ...(r.hasVisited !== undefined ? { hasVisited: r.hasVisited } : {}),
      checkedAt: r.checkedAt,
    };
  }

  private async requireFacility(code: string): Promise<FacilityRef> {
    const f = await this.d.facilities.findByCode(code);
    if (!f || f.status === 'INACTIVE') throw new AppError('NOT_FOUND', 'Không tìm thấy cơ sở');
    if (f.status === 'PAUSED') throw new AppError('FACILITY_PAUSED');
    return f;
  }

  private async requireAccount(accountId: string) {
    const a = await this.d.accounts.load(accountId);
    if (!a) throw new AppError('UNAUTHENTICATED');
    return a;
  }

  private async limit(key: string, max: number, windowSec: number) {
    const r = await this.d.limiter.hit(key, max, windowSec);
    if (!r.allowed) throw new AppError('RATE_LIMITED');
  }

  private async audit(accountId: string, facility: FacilityRef, maBN: string | undefined, ipHash?: string) {
    await this.d.audit.write({
      actorType: 'PATIENT',
      actorId: accountId,
      action: 'IDENTIFY',
      module: 'identity',
      // MaBN băm, không ghi rõ (C03 mục 6)
      target: maBN ? this.d.pii.hmac(`${facility.code}:${maBN}`).slice(0, 16) : undefined,
      diff: { facility: facility.code },
      ipHash,
    });
  }
}
