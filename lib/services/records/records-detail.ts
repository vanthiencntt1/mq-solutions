import { z } from 'zod';
import {
  ImagingHis,
  PrescriptionHis,
  TestHis,
  fromHisDate,
  samePatient,
  toHisDay,
  type Encounter,
  type EncounterDetail,
  type Imaging,
  type Prescription,
  type Test,
} from '@/lib/domain/records/types';
import { RecordsData, type RecordContext } from './records-data';

/**
 * C04 mục 3: chi tiết chỉ lấy kết quả gắn với MAQL đã tìm bằng MaBN phía server.
 * Body không gửi lstMMyy: ApiDatKham lấy tháng từ MAQL, lọc theo MAQL và ngày dạng yyyymmdd
 * (dạng mà cả bản ApiDatKham cũ lẫn mới đều hiểu). Kết quả duyệt sau ngày khám vẫn được lấy (đến hôm nay).
 */
export async function loadEncounterDetail(
  data: RecordsData,
  ctx: RecordContext,
  encounter: Encounter,
  hisCode: string,
  now: Date,
): Promise<EncounterDetail> {
  const today = toHisDay(now.toISOString());
  const body = {
    PatientCode: ctx.maBN,
    EncounterCode: hisCode,
    FromDate: toHisDay(encounter.date),
    ToDate: today,
    RequestTime: today,
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
  const belongs = (r: { PatientCode?: string; EncounterCode?: string }) =>
    samePatient(r.PatientCode, ctx.maBN) && r.EncounterCode === hisCode;
  const tests: Test[] = await Promise.all(
    testsRaw.filter(belongs).map(async (r) => ({
      encounterId: encounter.id,
      date: fromHisDate(r.ReturnDate),
      name: r.ResultName || r.SymptonName,
      result: r.Result,
      unit: r.Unit,
      reference: r.UsualIndex,
      group: r.TypeName || undefined,
      sampleDate: r.GettingSampleDate ? fromHisDate(r.GettingSampleDate) : undefined,
      abnormal: r.Note === 'H' || r.Note === 'L' || (r.batthuong !== '' && r.batthuong !== '0'),
      ...(r.Base64String ? { fileUrl: await data.fileLink(ctx, r.Base64String) } : {}),
    })),
  );
  const imaging: Imaging[] = await Promise.all(
    imagingRaw.filter(belongs).map(async (r) => ({
      encounterId: encounter.id,
      date: fromHisDate(r.CreateDate),
      name: r.Name,
      description: r.Description,
      conclusion: r.Conclusion,
      typeName: r.TypeName || undefined,
      ...(r.Base64String ? { fileUrl: await data.fileLink(ctx, r.Base64String) } : {}),
    })),
  );
  // HIS cũ không trả EncounterCode cho thuốc nhưng đã lọc theo MAQL ở SQL.
  const prescriptions: Prescription[] = prescriptionsRaw
    .filter((r) => samePatient(r.PatientCode, ctx.maBN) && (!r.EncounterCode || r.EncounterCode === hisCode))
    .map((r) => ({
      encounterId: encounter.id,
      date: fromHisDate(r.CreateDate),
      name: r.Name,
      quantity: r.Quantity,
      form: r.Type,
      dosage: r.Dosage,
    }));
  return { ...encounter, tests, imaging, prescriptions };
}
