import { describe, expect, it } from 'vitest';
import { AppError } from '@/lib/domain/errors';
import type { RecordsDeps } from '@/lib/domain/records/ports';
import type { IdentResult } from '@/lib/domain/identity/types';
import { parseDateRange, samePatient } from '@/lib/domain/records/types';
import { RecordsService, RECORDS_TTL_SECONDS } from '@/lib/services/records/records-service';

const NOW = new Date('2026-10-27T03:00:00Z');
const ENCOUNTER = {
  EncounterCode: '20261027000124000001',
  CreateDate: '27/10/2026 08:00',
  RoomName: 'Phòng Nội',
  DoctorName: 'Bác sĩ Mẫu',
  ICDName: 'Viêm họng',
  PatientCode: '24000001',
};
// Lần khám hơn 12 tháng trước: chỉ có khi HIS trả toàn bộ hồ sơ (btdbn.nam)
const OLD_ENCOUNTER = { ...ENCOUNTER, EncounterCode: '20230315000124000009', CreateDate: '15/03/2023 09:30' };
const FOUND: IdentResult = { status: 'FOUND', maBN: '24000001', checkedAt: NOW.toISOString() };

function setup(
  opts: {
    identity?: IdentResult;
    hisError?: Error;
    withFile?: boolean;
    wrongPatient?: boolean;
    failMonth?: string;
    /** ApiDatKham chưa nâng cấp: MMyy rỗng không có dữ liệu, thiếu EncounterCode bị từ chối. */
    oldHis?: boolean;
  } = {},
) {
  const calls: { path: string; body: Record<string, unknown>; timeout?: number }[] = [];
  const audit: { action: string; target?: string; kind?: unknown }[] = [];
  const cache = new Map<string, unknown>();
  const ttls: number[] = [];
  let hits = 0;
  const deps: RecordsDeps = {
    identity: { resolve: async () => opts.identity ?? FOUND },
    facilities: {
      findByCode: async (code) =>
        code === 'BVA'
          ? {
              id: 'facility-1',
              code,
              name: 'Bệnh viện A',
              slug: 'bva',
              status: 'ACTIVE',
            }
          : null,
    },
    his: {
      async call<T>(_facility: string, path: string, body: unknown, config?: { timeoutMs?: number }) {
        calls.push({ path, body: body as Record<string, unknown>, timeout: config?.timeoutMs });
        if (opts.hisError) throw opts.hisError;
        if (path === 'MedicalRecords/GetEncounter') {
          const month = (body as { MMyy: string }).MMyy;
          if (month === '' && !opts.oldHis) return [ENCOUNTER, OLD_ENCOUNTER] as T;
          if (month === opts.failMonth) throw new AppError('HIS_ERROR');
          return (month === '1026' ? [ENCOUNTER] : []) as T;
        }
        const allMode = !(body as { EncounterCode?: string }).EncounterCode;
        if (opts.oldHis && allMode && path.startsWith('MedicalRecords/')) throw new AppError('HIS_ERROR');
        if (path === 'MedicalRecords/GetTestResults')
          return [
            {
              PatientCode: opts.wrongPatient ? '24000002' : '24000001',
              EncounterCode: ENCOUNTER.EncounterCode,
              ReturnDate: '27/10/2026',
              SymptonName: 'Công thức máu',
              ResultName: 'Bạch cầu',
              Result: '12',
              Unit: 'G/L',
              UsualIndex: '4-10',
              Note: 'H',
              Base64String: '',
            },
          ] as T;
        if (path === 'MedicalRecords/GetImageDiagnosticResults' && opts.withFile)
          return [
            {
              PatientCode: '24000001',
              EncounterCode: ENCOUNTER.EncounterCode,
              CreateDate: '27/10/2026',
              Name: 'X-quang',
              Description: 'Bình thường',
              Conclusion: 'Bình thường',
              Base64String: Buffer.from('%PDF-1.4 fake').toString('base64'),
            },
          ] as T;
        if (path === 'Reexamination/GetReexaminationPatientInfo')
          return [
            {
              PatientCode: 24000001,
              ReexaminationDate: '20261103',
              SubjectID: 'NOI',
              RoomID: '101',
              mobile: '0900000001',
              social_id: '079090000001',
              name: 'Mẫu',
            },
          ] as T;
        return [] as T;
      },
    },
    cache: {
      get: async <T>(key: string) => (cache.get(key) as T) ?? null,
      set: async (key, data, ttl) => {
        cache.set(key, data);
        ttls.push(ttl);
      },
      del: async (key) => {
        cache.delete(key);
      },
    },
    limiter: { hit: async () => ({ allowed: ++hits <= 60, count: hits }) },
    audit: {
      write: async (event) => {
        audit.push({ action: event.action, target: event.target, kind: event.diff?.kind });
      },
    },
    pii: {
      encrypt: (s) => `ENC:${s}`,
      decrypt: (s) => s.slice(4),
      hmac: (s) => String(s.length).padStart(64, 'a'),
    },
    now: () => NOW,
    token: () => '123e4567-e89b-42d3-a456-426614174000',
  };
  return { service: new RecordsService(deps), calls, audit, cache, ttls };
}

describe('RecordsService – C04', () => {
  it('lấy toàn bộ lần khám bằng 1 lần gọi MMyy rỗng, bỏ trường nhạy cảm, cache mã hóa 30 phút và audit mỗi lượt', async () => {
    const { service, calls, audit, cache, ttls } = setup();
    const first = await service.encounters('account-1', 'BVA');
    const second = await service.encounters('account-1', 'BVA');
    expect(first).toEqual(second);
    expect(JSON.stringify(first)).not.toContain('24000001');
    // Có cả lần khám năm 2023 (ngoài 12 tháng), mới nhất trước
    expect(first.map((e) => e.date)).toEqual(['2026-10-27', '2023-03-15']);
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      path: 'MedicalRecords/GetEncounter',
      body: { PatientCode: '24000001', MMyy: '' },
      timeout: 10_000,
    });
    expect([...cache.values()][0]).toMatch(/^ENC:/);
    expect(ttls).toEqual([RECORDS_TTL_SECONDS]);
    expect(audit).toHaveLength(2);
    expect(audit[0]).toMatchObject({ action: 'VIEW_RECORD', kind: 'encounters' });
    expect(audit[0]?.target).not.toContain('24000001');
  });

  it('lọc lần khám theo khoảng ngày', async () => {
    const { service } = setup();
    expect(await service.encounters('account-1', 'BVA', { from: '2026-01-01' })).toHaveLength(1);
    await expect(
      service.encounters('account-1', 'BVA', { from: '2026-10-27', to: '2026-01-01' }),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
  });

  it('HIS chưa nâng cấp: MMyy rỗng không có dữ liệu thì quét 12 tháng gần nhất', async () => {
    const { service, calls } = setup({ oldHis: true });
    expect(await service.encounters('account-1', 'BVA')).toHaveLength(1);
    expect(calls).toHaveLength(13);
    expect(calls.map((c) => c.body.MMyy)).toContain('1026');
  });

  it.each([
    { status: 'NEW_PATIENT', code: 'IDENTITY_NOT_FOUND' },
    { status: 'MISMATCH', code: 'IDENTITY_MISMATCH' },
  ] as const)('chặn $status trước khi gọi HIS', async ({ status, code }) => {
    const { service, calls, audit } = setup({ identity: { status, checkedAt: NOW.toISOString() } });
    await expect(service.encounters('account-1', 'BVA')).rejects.toMatchObject({ code });
    expect(calls).toHaveLength(0);
    expect(audit).toHaveLength(0);
  });

  it('xét nghiệm toàn bộ hồ sơ: 1 lần gọi không EncounterCode, không lộ PatientCode', async () => {
    const { service, calls, audit } = setup();
    const rows = await service.tests('account-1', 'BVA', {});
    expect(rows).toMatchObject([{ name: 'Bạch cầu', abnormal: true }]);
    expect(rows[0]?.encounterId).toBeTruthy();
    expect(JSON.stringify(rows)).not.toContain('24000001');
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      path: 'MedicalRecords/GetTestResults',
      body: { PatientCode: '24000001' },
      timeout: 10_000,
    });
    expect(calls[0]?.body).not.toHaveProperty('EncounterCode');
    expect(audit).toHaveLength(1);
    // Lọc ngày phía web
    expect(await service.tests('account-1', 'BVA', { from: '2026-10-28' })).toEqual([]);
  });

  it('HIS chưa nâng cấp: tra xét nghiệm theo từng lần khám với ngày yyyymmdd', async () => {
    const { service, calls } = setup({ oldHis: true });
    expect(await service.tests('account-1', 'BVA', {})).toMatchObject([{ name: 'Bạch cầu' }]);
    expect(calls.at(-1)).toMatchObject({
      path: 'MedicalRecords/GetTestResults',
      body: {
        PatientCode: '24000001',
        EncounterCode: ENCOUNTER.EncounterCode,
        FromDate: '20261027',
        ToDate: '20261027',
      },
    });
  });

  it('chi tiết lần khám dùng ID băm, không nhận mã HIS trong URL', async () => {
    const { service, audit } = setup();
    const [row] = await service.encounters('account-1', 'BVA');
    await expect(service.encounter('account-1', 'BVA', ENCOUNTER.EncounterCode)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    expect(await service.encounter('account-1', 'BVA', row!.id)).toMatchObject({
      ...row,
      tests: [{ name: 'Bạch cầu' }],
      imaging: [],
      prescriptions: [],
    });
    expect(audit.map((e) => e.kind)).toEqual(['encounters', 'encounter-detail']);
  });

  it('không trả dữ liệu cache cũ khi HIS lỗi lần đầu', async () => {
    const { service, audit, cache, calls } = setup({ hisError: new AppError('HIS_UNAVAILABLE') });
    await expect(service.encounters('account-1', 'BVA')).rejects.toMatchObject({ code: 'HIS_UNAVAILABLE' });
    expect(audit).toHaveLength(0);
    expect(cache.size).toBe(0);
    expect(calls).toHaveLength(2); // 1 lần gọi toàn bộ hồ sơ, thử lại một lần
  });

  it('một tháng HIS lỗi (thiếu bảng tháng) vẫn hiện các lần khám của tháng khác', async () => {
    const { service } = setup({ failMonth: '1125', oldHis: true });
    expect(await service.encounters('account-1', 'BVA')).toMatchObject([{ room: 'Phòng Nội' }]);
  });

  it('loại dòng kết quả HIS có PatientCode khác MaBN đã định danh', async () => {
    const { service } = setup({ wrongPatient: true });
    expect(await service.tests('account-1', 'BVA', { from: '2026-10-01', to: '2026-10-27' })).toEqual([]);
  });

  it('PatientCode dạng số mất số 0 đầu vẫn khớp MaBN', () => {
    expect(samePatient('4000001', '04000001')).toBe(true);
    expect(samePatient('4000002', '04000001')).toBe(false);
    expect(samePatient(undefined, '04000001')).toBe(true);
  });

  it('chỉ trả trường tái khám cần thiết, không lộ tên, SĐT hay CCCD từ HIS', async () => {
    const { service, audit } = setup();
    const rows = await service.reexams('account-1', 'BVA', { from: '2026-10-01', to: '2026-11-30' });
    expect(rows).toEqual([{ date: '2026-11-03', specialtyCode: 'NOI', roomCode: '101' }]);
    expect(JSON.stringify(rows)).not.toContain('0900000001');
    expect(audit).toHaveLength(1);
  });

  it('hạn chế khoảng ngày tối đa 12 tháng', () => {
    expect(() => parseDateRange({ from: '2025-01-01', to: '2026-10-27' }, NOW)).toThrowError(AppError);
    expect(parseDateRange({}, NOW)).toEqual({ from: '2025-11-01', to: '2026-10-27' });
  });

  it('liên kết file không có token hoặc hết hạn trả 403', async () => {
    const { service } = setup();
    await expect(service.file('account-1', '123e4567-e89b-42d3-a456-426614174000')).rejects.toMatchObject({
      code: 'RECORD_FILE_EXPIRED',
      status: 403,
    });
  });

  it('file PDF chỉ mở cho đúng tài khoản, hết hạn 5 phút và được audit', async () => {
    const { service, cache, ttls, audit } = setup({ withFile: true });
    const [row] = await service.imaging('account-1', 'BVA', { from: '2026-10-01', to: '2026-10-27' });
    expect(row?.fileUrl).toMatch(/^\/api\/files\/123e4567-e89b-42d3-a456-426614174000\.[0-9a-f]{32}$/);
    expect(ttls).toContain(300);
    expect([...cache.values()].join('')).not.toContain('%PDF-1.4');
    const token = row!.fileUrl!.slice('/api/files/'.length);
    await expect(service.file('account-1', `${token.slice(0, -1)}b`)).rejects.toMatchObject({
      code: 'RECORD_FILE_EXPIRED',
    });
    await expect(service.file('account-2', token)).rejects.toMatchObject({ code: 'RECORD_FILE_EXPIRED' });
    expect((await service.file('account-1', token)).mime).toBe('application/pdf');
    expect(audit.map((e) => e.kind)).toEqual(['imaging', 'file']);
    cache.delete(`record:file:${token}`);
    await expect(service.file('account-1', token)).rejects.toMatchObject({ code: 'RECORD_FILE_EXPIRED' });
  });

  it('giới hạn tần suất lượt xem hồ sơ', async () => {
    const { service, audit } = setup();
    for (let i = 0; i < 60; i++) await service.encounters('account-1', 'BVA');
    await expect(service.encounters('account-1', 'BVA')).rejects.toMatchObject({ code: 'RATE_LIMITED' });
    expect(audit).toHaveLength(60);
  });
});
