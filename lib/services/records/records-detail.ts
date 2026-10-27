import { z } from 'zod';
import {
  ImagingHis,
  PrescriptionHis,
  TestHis,
  fromHisDate,
  toHisDate,
  type Encounter,
  type EncounterDetail,
  type Imaging,
  type Prescription,
  type Test,
} from '@/lib/domain/records/types';
import { RecordsData, type RecordContext } from './records-data';

/** C04 mục 3: chi tiết chỉ lấy kết quả gắn với MAQL đã tìm bằng MaBN phía server. */
export async function loadEncounterDetail(
  data: RecordsData,
  ctx: RecordContext,
  encounter: Encounter,
  hisCode: string,
  now: Date,
): Promise<EncounterDetail> {
  const month = encounter.date.slice(0, 7);
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0))
    .toISOString()
    .slice(0, 10);
  const body = {
    PatientCode: ctx.maBN,
    FromDate: toHisDate(`${month}-01`),
    ToDate: toHisDate(lastDay),
    lstMMyy: `${month.slice(5, 7)}${month.slice(2, 4)}`,
    EncounterCode: hisCode,
    RequestTime: toHisDate(now.toISOString().slice(0, 10)),
  };
  const [testsRaw, imagingRaw, prescriptionsRaw] = await Promise.all([
    data.cached(ctx, 'tests', `detail:${encounter.id}`, z.array(TestHis), () =>
      data.call(ctx, 'MedicalRecords/GetTestResults', body, z.array(TestHis)),
    ),
    data.cached(ctx, 'imaging', `detail:${encounter.id}`, z.array(ImagingHis), () =>
      data.call(ctx, 'MedicalRecords/GetImageDiagnosticResults', body, z.array(ImagingHis)),
    ),
    data.cached(ctx, 'prescriptions', `detail:${encounter.id}`, z.array(PrescriptionHis), () =>
      data.call(ctx, 'MedicalRecords/GetPrescription', body, z.array(PrescriptionHis)),
    ),
  ]);
  const tests: Test[] = await Promise.all(
    testsRaw
      .filter((r) => (!r.PatientCode || r.PatientCode === ctx.maBN) && r.EncounterCode === hisCode)
      .map(async (r) => ({
        encounterId: encounter.id,
        date: fromHisDate(r.ReturnDate),
        name: r.ResultName || r.SymptonName,
        result: r.Result,
        unit: r.Unit,
        reference: r.UsualIndex,
        abnormal: r.Note === 'H' || r.Note === 'L',
        ...(r.Base64String ? { fileUrl: await data.fileLink(ctx, r.Base64String) } : {}),
      })),
  );
  const imaging: Imaging[] = await Promise.all(
    imagingRaw
      .filter((r) => (!r.PatientCode || r.PatientCode === ctx.maBN) && r.EncounterCode === hisCode)
      .map(async (r) => ({
        encounterId: encounter.id,
        date: fromHisDate(r.CreateDate),
        name: r.Name,
        description: r.Description,
        conclusion: r.Conclusion,
        ...(r.Base64String ? { fileUrl: await data.fileLink(ctx, r.Base64String) } : {}),
      })),
  );
  const prescriptions: Prescription[] = prescriptionsRaw.map((r) => ({
    encounterId: encounter.id,
    date: fromHisDate(r.CreateDate),
    name: r.Name,
    quantity: r.Quantity,
    form: r.Type,
    dosage: r.Dosage,
  }));
  return { ...encounter, tests, imaging, prescriptions };
}
