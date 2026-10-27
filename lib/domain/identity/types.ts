import { normalizeName } from '@/lib/domain/account/cccd';

// Định danh bệnh nhân theo cơ sở – core/C03. Thuần TS, không phụ thuộc hạ tầng.

/** Bệnh nhân do ApiDatKham trả (Patient: id, name = tên, surname = họ + đệm, birthyear, sex, mobile, social_id). */
export interface HisPatient {
  id: string;
  surname: string;
  name: string;
  birthYear: number | null;
  sex: number | null;
  mobile: string | null;
  socialId: string | null;
}

export type IdentStatus = 'FOUND' | 'MISMATCH' | 'NEW_PATIENT';

/** Kết quả giữ trong Redis 30 phút (C03 mục 6). `maBN` chỉ server đọc. */
export interface IdentResult {
  status: IdentStatus;
  maBN?: string;
  hisFullName?: string;
  hisBirthYear?: number;
  hisPhone?: string;
  hisSex?: number;
  hasVisited?: boolean;
  checkedAt: string;
}

export interface AccountIdentity {
  fullName: string;
  birthYear: number;
}

const hisFullNameNorm = (p: HisPatient) => normalizeName(`${p.surname} ${p.name}`);

/**
 * Lọc danh sách HIS: họ tên không dấu + năm sinh phải khớp tuyệt đối (C03 mục 4 bước 3).
 * Không so mờ để không nhận nhầm người.
 */
export function filterMatching(candidates: HisPatient[], who: AccountIdentity): HisPatient[] {
  const nameNorm = normalizeName(who.fullName);
  return candidates.filter((p) => hisFullNameNorm(p) === nameNorm && p.birthYear === who.birthYear);
}

export function toFound(p: HisPatient, hasVisited: boolean, now: Date): IdentResult {
  return {
    status: 'FOUND',
    maBN: p.id,
    hisFullName: `${p.surname} ${p.name}`.trim(),
    ...(p.birthYear !== null ? { hisBirthYear: p.birthYear } : {}),
    ...(p.mobile ? { hisPhone: p.mobile } : {}),
    ...(p.sex !== null ? { hisSex: p.sex } : {}),
    hasVisited,
    checkedAt: now.toISOString(),
  };
}

/** Chuỗi MMyy các tháng gần nhất (GetEncounter tra theo tháng): 2026-10 → "1026". */
export function recentMmyy(now: Date, months: number): string[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return `${String(d.getUTCMonth() + 1).padStart(2, '0')}${String(d.getUTCFullYear()).slice(-2)}`;
  });
}
