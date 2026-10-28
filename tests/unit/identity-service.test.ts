import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { FacilityRef, IdentityDeps } from '@/lib/domain/identity/ports';
import { filterMatching, recentMmyy, type HisPatient } from '@/lib/domain/identity/types';
import { IdentityService } from '@/lib/services/identity/identity-service';

const FAC: FacilityRef = { id: 'f-a', code: 'BVA', name: 'BV A', slug: 'bva', status: 'ACTIVE' };
const ACCOUNT = {
  id: 'acc1',
  cccd: '079090000001',
  phone: '0900000001',
  fullName: 'Nguyễn Văn Mẫu',
  birthYear: 1990,
};

const patient = (over: Record<string, unknown> = {}) => ({
  id: '24000001',
  surname: 'NGUYEN VAN',
  name: 'MAU',
  birthyear: '1990',
  mobile: '0900000001',
  social_id: '079090000001',
  sex: 1,
  ...over,
});

type Handler = (path: string, body: Record<string, unknown>) => unknown;

function setup(handler: Handler, opts: { facility?: FacilityRef } = {}) {
  const calls: string[] = [];
  const cache = new Map<string, unknown>();
  const audit: string[] = [];
  const counters = new Map<string, number>();
  const deps: IdentityDeps = {
    his: {
      async call<T>(_f: string, path: string, body: unknown) {
        calls.push(path);
        const r = handler(path, body as Record<string, unknown>);
        if (r instanceof Error) throw r;
        return r as T;
      },
    },
    cache: {
      get: async <T>(k: string) => (cache.get(k) as T) ?? null,
      set: async (k, v) => void cache.set(k, v),
      del: async (k) => void cache.delete(k),
    },
    limiter: {
      async hit(key, limit) {
        const n = (counters.get(key) ?? 0) + 1;
        counters.set(key, n);
        return { allowed: n <= limit, count: n };
      },
    },
    audit: { write: async (e) => void audit.push(`${e.action}:${e.target ?? ''}`) },
    facilities: {
      findByCode: async (code) => ((opts.facility ?? FAC).code === code ? (opts.facility ?? FAC) : null),
      listBookedBy: async () => [],
    },
    accounts: { load: async (id) => (id === ACCOUNT.id ? ACCOUNT : null) },
    pii: { hmac: (v) => `h(${v})` },
    now: () => new Date('2026-10-27T03:00:00Z'),
  };
  return { svc: new IdentityService(deps), calls, cache, audit };
}

const notFound = () => new AppError('NOT_FOUND');
const visited = (path: string) => (path === 'MedicalRecords/GetEncounter' ? [{}] : undefined);

describe('lọc khớp họ tên + năm sinh', () => {
  const who = { fullName: 'Nguyễn Văn Mẫu', birthYear: 1990 };
  const p = (surname: string, name: string, birthYear: number | null): HisPatient => ({
    id: '1',
    surname,
    name,
    birthYear,
    sex: null,
    mobile: null,
    socialId: null,
  });
  it('bỏ dấu, không phân biệt hoa thường', () => {
    expect(filterMatching([p('nguyen van', 'mau', 1990)], who)).toHaveLength(1);
  });
  it('lệch năm sinh hoặc tên → loại, không so mờ', () => {
    expect(filterMatching([p('NGUYEN VAN', 'MAU', 1991)], who)).toHaveLength(0);
    expect(filterMatching([p('NGUYEN VAN', 'MAN', 1990)], who)).toHaveLength(0);
    expect(filterMatching([p('NGUYEN VAN', 'MAU', null)], who)).toHaveLength(0);
  });
  it('MMyy các tháng gần nhất, qua năm', () => {
    expect(recentMmyy(new Date('2026-01-15T00:00:00Z'), 3)).toEqual(['0126', '1225', '1125']);
  });
});

describe('IdentityService.identify', () => {
  it('CCCD có trong HIS, khớp → FOUND, MaBN bị che, lần sau dùng cache', async () => {
    const { svc, calls, audit } = setup((path) =>
      path === 'Patients/getPatientsByMobile' ? [patient()] : visited(path),
    );
    const r = await svc.identify('acc1', 'BVA');
    expect(r).toMatchObject({ status: 'FOUND', maBNMasked: '****0001', hasVisited: true });
    expect(JSON.stringify(r)).not.toContain('24000001');

    const before = calls.length;
    await svc.identify('acc1', 'BVA');
    expect(calls.length).toBe(before); // 30 phút sau không gọi lại HIS
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatch(/^IDENTIFY:h\(BVA:24000001\)/);
  });

  it('HIS chưa lưu CCCD nhưng có SĐT khớp → FOUND qua bước 2', async () => {
    const { svc, calls } = setup((path, body) => {
      if (path !== 'Patients/getPatientsByMobile') return visited(path);
      return body.Social_id ? notFound() : [patient({ social_id: null })];
    });
    expect((await svc.identify('acc1', 'BVA')).status).toBe('FOUND');
    expect(calls.slice(0, 2)).toEqual(['Patients/getPatientsByMobile', 'Patients/getPatientsByMobile']);
  });

  it('họ tên khớp, năm sinh lệch → MISMATCH và không lộ thông tin HIS', async () => {
    const { svc } = setup((path) =>
      path === 'Patients/getPatientsByMobile' ? [patient({ birthyear: '1991' })] : undefined,
    );
    const r = await svc.identify('acc1', 'BVA');
    expect(r.status).toBe('MISMATCH');
    expect(r.maBNMasked).toBeUndefined();
  });

  it('không có trong HIS → NEW_PATIENT', async () => {
    const { svc } = setup(() => notFound());
    expect((await svc.identify('acc1', 'BVA')).status).toBe('NEW_PATIENT');
  });

  it('hồ sơ trùng: chọn MaBN có lần khám gần nhất', async () => {
    const { svc } = setup((path, body) => {
      if (path === 'Patients/getPatientsByMobile')
        return [patient({ id: 'AAA00001' }), patient({ id: 'BBB00002' })];
      if (path === 'MedicalRecords/GetEncounter') {
        // BBB00002 khám tháng này; AAA00001 chỉ khám 4 tháng trước
        const recent = body.MMyy === '1026';
        const old = body.MMyy === '0626';
        if (body.PatientCode === 'BBB00002' && recent) return [{}];
        if (body.PatientCode === 'AAA00001' && old) return [{}];
      }
      return notFound();
    });
    const full = await svc.resolve('acc1', 'BVA');
    expect(full.maBN).toBe('BBB00002');
  });

  it('HIS mới: 1 lần GetEncounter MMyy rỗng mỗi MaBN, so ngày khám thật (kể cả ngoài 6 tháng)', async () => {
    const months: unknown[] = [];
    const { svc } = setup((path, body) => {
      if (path === 'Patients/getPatientsByMobile')
        return [patient({ id: 'AAA00001' }), patient({ id: 'BBB00002' })];
      if (path === 'MedicalRecords/GetEncounter') months.push(body.MMyy);
      if (path === 'MedicalRecords/GetEncounter' && body.MMyy === '')
        return body.PatientCode === 'AAA00001'
          ? [{ CreateDate: '15/03/2023 09:00' }, { CreateDate: '02/01/2025 07:30' }]
          : [{ CreateDate: '20/12/2024 10:00' }];
      return notFound();
    });
    const full = await svc.resolve('acc1', 'BVA');
    expect(full.maBN).toBe('AAA00001');
    expect(full.hasVisited).toBe(true);
    // Không quét theo tháng khi HIS đã trả toàn bộ hồ sơ
    expect(months.length).toBeGreaterThan(0);
    expect(months.every((m) => m === '')).toBe(true);
  });

  it('HIS lỗi → UNAVAILABLE và không cache', async () => {
    let fail = true;
    const { svc, cache } = setup((path) => {
      if (fail) return new AppError('HIS_UNAVAILABLE');
      return path === 'Patients/getPatientsByMobile' ? [patient()] : notFound();
    });
    expect((await svc.identify('acc1', 'BVA')).status).toBe('UNAVAILABLE');
    expect(cache.size).toBe(0);
    fail = false;
    expect((await svc.identify('acc1', 'BVA')).status).toBe('FOUND');
  });

  it('cơ sở tạm ngưng / không tồn tại', async () => {
    const paused = setup(() => notFound(), { facility: { ...FAC, status: 'PAUSED' } });
    await expect(paused.svc.identify('acc1', 'BVA')).rejects.toMatchObject({ code: 'FACILITY_PAUSED' });
    const none = setup(() => notFound());
    await expect(none.svc.identify('acc1', 'XXX')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('"Tải lại" bỏ qua cache nhưng bị giới hạn tần suất', async () => {
    const { svc, calls } = setup((path) =>
      path === 'Patients/getPatientsByMobile' ? [patient()] : notFound(),
    );
    await svc.identify('acc1', 'BVA');
    const before = calls.length;
    await svc.identify('acc1', 'BVA', { refresh: true });
    expect(calls.length).toBeGreaterThan(before);
    for (let i = 0; i < 9; i++) await svc.identify('acc1', 'BVA', { refresh: true });
    await expect(svc.identify('acc1', 'BVA', { refresh: true })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});

describe('IdentityService.identifyByMaBN', () => {
  it('MaBN đúng và khớp họ tên + năm sinh → FOUND, ghi cache', async () => {
    const { svc, cache } = setup((path) => (path === 'Patients/GetPatientByID' ? patient() : visited(path)));
    const r = await svc.identifyByMaBN('acc1', 'BVA', '24000001');
    expect(r).toMatchObject({ status: 'FOUND', maBNMasked: '****0001' });
    expect(cache.get('ident:acc1:BVA')).toMatchObject({ maBN: '24000001' });
  });

  it('MaBN của người khác hoặc không tồn tại → MISMATCH như nhau', async () => {
    const other = setup((path) =>
      path === 'Patients/GetPatientByID' ? patient({ surname: 'LE', name: 'HOA' }) : notFound(),
    );
    expect((await other.svc.identifyByMaBN('acc1', 'BVA', '24000009')).status).toBe('MISMATCH');
    const none = setup(() => notFound());
    expect((await none.svc.identifyByMaBN('acc1', 'BVA', '24000009')).status).toBe('MISMATCH');
  });

  it('tối đa 5 lần / giờ / tài khoản', async () => {
    const { svc } = setup(() => notFound());
    for (let i = 0; i < 5; i++) await svc.identifyByMaBN('acc1', 'BVA', '24000009');
    await expect(svc.identifyByMaBN('acc1', 'BVA', '24000009')).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    });
  });
});
