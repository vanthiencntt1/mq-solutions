import { readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { decrypt3DES, encrypt3DES } from '../../../lib/infra/his/crypto';
import {
  DOCTORS,
  ENCOUNTERS,
  IMAGING_RESULTS,
  PATIENTS,
  PRESCRIPTIONS,
  REEXAMS,
  ROOMS,
  SUBJECTS,
  TEST_RESULTS,
  TIME_SLOTS,
} from './data';

// Mock ApiDatKham cho local (00-CONG-NGHE-QUY-UOC mục 13). URL: http://localhost:4010/{mã cơ sở}/{Controller}/{Action}
// Khóa 3DES đọc từ HIS_KEY_<MÃ>, giống web.

const port = Number(process.env.MOCK_HIS_PORT ?? 4010);

type Handler = (body: Record<string, unknown>) => unknown;

const next14Days = () =>
  Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.now() + (i + 1) * 86_400_000);
    return d.toISOString().slice(0, 10);
  });

const ROUTES: Record<string, Handler> = {
  'Subjects/GetSubjects': () => SUBJECTS,
  'Doctors/GetDoctors': () => DOCTORS,
  'Rooms/GetRooms': () => ROOMS,
  'Rooms/GetRoombySubjectID': (b) => ROOMS.filter((r) => r.subject_id === b.subject_id),
  'Rooms/GetRoomTimeSlots': () => TIME_SLOTS,
  'Schedules/GetSchedules': (b) =>
    next14Days().flatMap((date) =>
      ROOMS.filter((r) => !b.room_id || r.id === Number(b.room_id)).map((r) => ({
        date,
        room_id: r.id,
        doctor_id: DOCTORS.find((d) => d.subject_id === r.subject_id)?.id,
        session: 'SANG',
      })),
    ),
  'Booking/Getserialnumber': () => [],
  'Patients/getPatientsByMobile': (b) =>
    PATIENTS.filter(
      (p) => (b.Social_id && p.social_id === b.Social_id) || (b.mobile && p.mobile === b.mobile),
    ),
  'Patients/GetPatientByID': (b) => PATIENTS.find((p) => p.id === b.ID) ?? [],
  'MedicalRecords/GetEncounter': (b) => {
    const e = ENCOUNTERS[String(b.PatientCode)];
    const nowMmyy = `${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getFullYear()).slice(-2)}`;
    return e && String(b.MMyy).split(',').includes(nowMmyy) ? [e] : [];
  },
  'MedicalRecords/GetTestResults': (b) =>
    TEST_RESULTS.filter((r) => r.PatientCode === b.PatientCode && r.EncounterCode === b.EncounterCode),
  'MedicalRecords/GetImageDiagnosticResults': (b) =>
    IMAGING_RESULTS.filter((r) => r.PatientCode === b.PatientCode && r.EncounterCode === b.EncounterCode),
  'MedicalRecords/GetPrescription': (b) =>
    b.PatientCode === '24000001' && b.EncounterCode === ENCOUNTERS['24000001']?.EncounterCode
      ? PRESCRIPTIONS
      : [],
  'Reexamination/GetReexaminationPatientInfo': (b) =>
    REEXAMS.filter((r) => String(r.PatientCode) === b.PatientCode),
};

// Endpoint của từng tính năng nằm ở routes/*.ts (export routes) – nạp tự động, file sau ghi đè file trước.
const EXTRA: Record<string, Handler> = {};
const extraLoaded = Promise.all(
  readdirSync(join(__dirname, 'routes'))
    .filter((f) => f.endsWith('.ts'))
    .map(async (f) => {
      const mod = (await import(join(__dirname, 'routes', f))) as { routes?: Record<string, Handler> };
      Object.assign(EXTRA, mod.routes ?? {});
    }),
);

createServer(async (req, res) => {
  await extraLoaded;
  const [, facility = '', controller = '', action = ''] = (req.url ?? '').split('/');
  const key = process.env[`HIS_KEY_${facility.toUpperCase()}`];
  const handler = EXTRA[`${controller}/${action}`] ?? ROUTES[`${controller}/${action}`];
  const send = (status: number, payload: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  };
  if (req.method !== 'POST' || !key) return send(400, { Successful: false, ErrorCode: 'BAD_REQUEST' });
  if (!handler) return send(404, {});

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try {
    const { Data } = JSON.parse(Buffer.concat(chunks).toString('utf8')) as { Data: string };
    const body = JSON.parse(decrypt3DES(Data, key)) as Record<string, unknown>;
    const result = handler(body);
    if (Array.isArray(result) && result.length === 0 && controller !== 'Booking') return send(404, {});
    send(200, { Successful: true, Result: encrypt3DES(JSON.stringify(result), key), ErrorCode: '200' });
  } catch {
    send(200, { Successful: false, ErrorCode: 'JSONKHONGDUNGFORMAT', ErrorMessage: 'Sai định dạng' });
  }
}).listen(port, () => console.log(`[mock-his] http://localhost:${port}/{bva|bvb}/{Controller}/{Action}`));
