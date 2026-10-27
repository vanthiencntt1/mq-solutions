import { beforeEach, describe, expect, it } from 'vitest';
import { CircuitBreaker } from '@/lib/infra/his/circuit-breaker';
import { HisClient, type HisConnection } from '@/lib/infra/his/client';
import { decrypt3DES, encrypt3DES } from '@/lib/infra/his/crypto';
import { mapHisError } from '@/lib/infra/his/error-map';
import { decryptPii, encryptPii, hmacPii } from '@/lib/infra/crypto/pii';

const KEY = 'test-his-key';
const conn: HisConnection = {
  facilityId: 'f1',
  code: 'BVA',
  apiBaseUrl: 'http://his.local/',
  partnerCode: 'MQ_WEB',
  secretRef: 'HIS_KEY_TEST',
  timeoutMs: 1000,
};

beforeEach(() => {
  process.env.HIS_KEY_TEST = KEY;
});

describe('3DES ApiDatKham', () => {
  it('mã hóa / giải mã khứ hồi, có dấu tiếng Việt', () => {
    const plain = JSON.stringify({ PatientName: 'Nguyễn Văn Á' });
    expect(decrypt3DES(encrypt3DES(plain, KEY), KEY)).toBe(plain);
  });
});

describe('HisClient', () => {
  it('gửi Data mã hóa và giải mã Result', async () => {
    let sentUrl = '';
    const fakeFetch = (async (url: string, init: RequestInit) => {
      sentUrl = url;
      const { Data } = JSON.parse(String(init.body)) as { Data: string };
      const req = JSON.parse(decrypt3DES(Data, KEY)) as { id: string };
      return new Response(
        JSON.stringify({ successful: true, result: encrypt3DES(JSON.stringify([{ echo: req.id }]), KEY) }),
        { status: 200 },
      );
    }) as unknown as typeof fetch;
    const client = new HisClient(async () => conn, fakeFetch);
    const out = await client.call<{ echo: string }[]>('f1', 'Patients/GetPatientByID', { id: '24000001' });
    expect(sentUrl).toBe('http://his.local/Patients/GetPatientByID');
    expect(out[0]?.echo).toBe('24000001');
  });

  it('ánh xạ lỗi HIS sang mã nội bộ', async () => {
    const fakeFetch = (async () =>
      new Response(JSON.stringify({ Successful: false, ErrorCode: '4014' }), {
        status: 200,
      })) as unknown as typeof fetch;
    const client = new HisClient(async () => conn, fakeFetch);
    await expect(client.call('f1', 'Booking/PostBooking_Unpaid', {})).rejects.toMatchObject({
      code: 'BOOKING_ALREADY_TODAY',
    });
  });

  it('mất kết nối → HIS_UNAVAILABLE', async () => {
    const fakeFetch = (async () => {
      throw new TypeError('fetch failed');
    }) as unknown as typeof fetch;
    const client = new HisClient(async () => conn, fakeFetch);
    await expect(client.call('f1', 'Subjects/GetSubjects', {})).rejects.toMatchObject({
      code: 'HIS_UNAVAILABLE',
    });
  });
});

describe('cầu dao theo cơ sở', () => {
  it('5 lỗi liên tiếp → ngắt, hết 2 phút → thử lại', () => {
    let now = 0;
    const b = new CircuitBreaker(5, 120_000, () => now);
    for (let i = 0; i < 5; i++) b.record('A', false);
    expect(b.isOpen('A')).toBe(true);
    expect(b.isOpen('B')).toBe(false);
    now = 120_000;
    expect(b.isOpen('A')).toBe(false);
  });
});

describe('mapHisError', () => {
  it('mã số và tiền tố', () => {
    expect(mapHisError('-46')).toBe('CANCEL_PAID_NOT_ALLOWED');
    expect(mapHisError('NAMEPATIENTKHONGKHOP')).toBe('BOOKING_PATIENT_INFO_MISMATCH');
    expect(mapHisError('XYZ')).toBe('HIS_ERROR');
  });
});

describe('mã hóa PII', () => {
  it('AES-256-GCM khứ hồi, HMAC ổn định', () => {
    const s = 'x'.repeat(32);
    expect(decryptPii(encryptPii('079090000001', s), s)).toBe('079090000001');
    expect(hmacPii('079090000001', s)).toBe(hmacPii(' 079090000001 ', s));
  });
});
