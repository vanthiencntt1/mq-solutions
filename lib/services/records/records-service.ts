import { z } from 'zod';
import { AppError } from '@/lib/domain/errors';
import type { RecordsDeps } from '@/lib/domain/records/ports';
import {
  EncounterHis,
  EncounterId,
  ImagingHis,
  Mmyy,
  PrescriptionHis,
  ReexamHis,
  TestHis,
  monthsInRange,
  parseDateRange,
  fromHisDate,
  toHisDate,
  type DateRange,
  type Encounter,
  type Imaging,
  type Prescription,
  type Reexam,
  type Test,
} from '@/lib/domain/records/types';
import { RecordsAccess } from './records-access';
import { RecordsData, type RecordContext as Context, type RecordKind as Kind } from './records-data';
import { loadEncounterDetail } from './records-detail';

export { RECORDS_TTL_SECONDS } from './records-data';

// C04: bản sao bệnh án chỉ nằm trong Redis, mã hóa, tối đa 30 phút theo yêu cầu đợt này.
type InternalEncounter = Encounter & { hisCode: string };

export class RecordsService {
  private readonly data: RecordsData;
  private readonly access: RecordsAccess;
  constructor(private readonly d: RecordsDeps) {
    this.data = new RecordsData(d);
    this.access = new RecordsAccess(d);
  }

  async encounters(accountId: string, code: string, mmyy?: string, ipHash?: string) {
    const ctx = await this.access.context(accountId, code, ipHash);
    const months = mmyy ? [Mmyy.parse(mmyy)] : monthsInRange(parseDateRange({}, this.d.now()));
    await this.access.limit(ctx);
    const rows = (await this.loadEncounters(ctx, months)).map(({ hisCode: _hisCode, ...view }) => view);
    await this.access.audit(ctx, 'encounters');
    return rows;
  }

  async encounter(accountId: string, code: string, id: string, ipHash?: string, mmyy?: string) {
    const ctx = await this.access.context(accountId, code, ipHash);
    const encounterId = EncounterId.parse(id);
    await this.access.limit(ctx);
    const months = mmyy ? [Mmyy.parse(mmyy)] : monthsInRange(parseDateRange({}, this.d.now()));
    const row = (await this.loadEncounters(ctx, months)).find((e) => e.id === encounterId);
    if (!row) throw new AppError('NOT_FOUND', 'Không tìm thấy lần khám');
    const { hisCode, ...view } = row;
    const detail = await loadEncounterDetail(this.data, ctx, view, hisCode, this.d.now());
    await this.access.audit(ctx, 'encounter-detail');
    return detail;
  }

  async tests(
    accountId: string,
    code: string,
    rangeInput: Partial<DateRange>,
    ipHash?: string,
  ): Promise<Test[]> {
    return this.byEncounter(
      'tests',
      accountId,
      code,
      rangeInput,
      TestHis,
      'MedicalRecords/GetTestResults',
      (r, id) => ({
        encounterId: id,
        date: fromHisDate(r.ReturnDate),
        name: r.ResultName || r.SymptonName,
        result: r.Result,
        unit: r.Unit,
        reference: r.UsualIndex,
        abnormal: r.Note === 'H' || r.Note === 'L',
        file: r.Base64String,
      }),
      ipHash,
    );
  }

  async imaging(
    accountId: string,
    code: string,
    rangeInput: Partial<DateRange>,
    ipHash?: string,
  ): Promise<Imaging[]> {
    return this.byEncounter(
      'imaging',
      accountId,
      code,
      rangeInput,
      ImagingHis,
      'MedicalRecords/GetImageDiagnosticResults',
      (r, id) => ({
        encounterId: id,
        date: fromHisDate(r.CreateDate),
        name: r.Name,
        description: r.Description,
        conclusion: r.Conclusion,
        file: r.Base64String,
      }),
      ipHash,
    );
  }

  async prescriptions(
    accountId: string,
    code: string,
    rangeInput: Partial<DateRange>,
    ipHash?: string,
  ): Promise<Prescription[]> {
    return this.byEncounter(
      'prescriptions',
      accountId,
      code,
      rangeInput,
      PrescriptionHis,
      'MedicalRecords/GetPrescription',
      (r, id) => ({
        encounterId: id,
        date: fromHisDate(r.CreateDate),
        name: r.Name,
        quantity: r.Quantity,
        form: r.Type,
        dosage: r.Dosage,
      }),
      ipHash,
    );
  }

  async reexams(
    accountId: string,
    code: string,
    rangeInput: Partial<DateRange>,
    ipHash?: string,
  ): Promise<Reexam[]> {
    const ctx = await this.access.context(accountId, code, ipHash);
    // Hẹn tái khám sắp tới phải nằm trong khoảng mặc định, thay vì chỉ tra các ngày đã qua.
    const today = this.d.now().toISOString().slice(0, 10);
    const future = new Date(
      Date.UTC(this.d.now().getUTCFullYear(), this.d.now().getUTCMonth() + 11, this.d.now().getUTCDate()),
    )
      .toISOString()
      .slice(0, 10);
    const range = parseDateRange(
      { from: rangeInput.from ?? today, to: rangeInput.to ?? future },
      this.d.now(),
    );
    await this.access.limit(ctx);
    const rows = await this.data.cached(
      ctx,
      'reexams',
      `${range.from}:${range.to}`,
      z.array(ReexamHis),
      async () =>
        this.data.call(
          ctx,
          'Reexamination/GetReexaminationPatientInfo',
          {
            PatientCode: ctx.maBN,
            FromDate: toHisDate(range.from),
            ToDate: toHisDate(range.to),
            lstMMyy: monthsInRange(range).join(','),
            EncounterCode: '',
            RequestTime: toHisDate(this.d.now().toISOString().slice(0, 10)),
          },
          z.array(ReexamHis),
        ),
    );
    const view = rows
      .filter((r) => !r.PatientCode || r.PatientCode === ctx.maBN)
      .map((r) => ({
        date: fromHisDate(
          r.ReexaminationDate.length === 8 && /^\d{8}$/.test(r.ReexaminationDate)
            ? `${r.ReexaminationDate.slice(0, 4)}-${r.ReexaminationDate.slice(4, 6)}-${r.ReexaminationDate.slice(6)}`
            : r.ReexaminationDate,
        ),
        specialtyCode: r.SubjectID,
        roomCode: r.RoomID,
      }));
    await this.access.audit(ctx, 'reexams');
    return view;
  }

  async file(accountId: string, token: string, ipHash?: string): Promise<{ data: Uint8Array; mime: string }> {
    const payload = await this.data.filePayload(token);
    if (payload.accountId !== accountId) throw new AppError('RECORD_FILE_EXPIRED');
    const ctx = await this.access.context(accountId, payload.code, ipHash);
    if (ctx.maBN !== payload.maBN) throw new AppError('RECORD_FILE_EXPIRED');
    await this.access.limit(ctx);
    await this.access.audit(ctx, 'file');
    return { data: Buffer.from(payload.base64, 'base64'), mime: payload.mime };
  }

  private async byEncounter<T extends z.ZodRawShape, V extends { encounterId: string; file?: string }>(
    kind: Kind,
    accountId: string,
    code: string,
    rangeInput: Partial<DateRange>,
    schema: z.ZodObject<T>,
    path: string,
    map: (r: z.infer<z.ZodObject<T>>, id: string) => V,
    ipHash?: string,
  ): Promise<(Omit<V, 'file'> & { fileUrl?: string })[]> {
    const ctx = await this.access.context(accountId, code, ipHash);
    const range = parseDateRange(rangeInput, this.d.now());
    await this.access.limit(ctx);
    const encounters = (await this.loadEncounters(ctx, monthsInRange(range)))
      .filter((e) => e.date >= range.from && e.date <= range.to)
      .slice(0, 100);
    const results: (Omit<V, 'file'> & { fileUrl?: string })[][] = [];
    // Mỗi đợt tối đa 5 lần khám để không dồn hàng trăm request lên một ApiDatKham.
    for (let i = 0; i < encounters.length; i += 5) {
      const batch = await Promise.all(
        encounters.slice(i, i + 5).map(async (e) => {
          const rows = await this.data.cached(
            ctx,
            kind,
            `${range.from}:${range.to}:${e.id}`,
            z.array(schema),
            () =>
              this.data.call(
                ctx,
                path,
                {
                  PatientCode: ctx.maBN,
                  FromDate: toHisDate(range.from),
                  ToDate: toHisDate(range.to),
                  lstMMyy: monthsInRange(range).join(','),
                  EncounterCode: e.hisCode,
                  RequestTime: toHisDate(this.d.now().toISOString().slice(0, 10)),
                },
                z.array(schema),
              ),
          );
          return Promise.all(
            rows
              .filter(
                (row) =>
                  (!('PatientCode' in row) || !row.PatientCode || String(row.PatientCode) === ctx.maBN) &&
                  (!('EncounterCode' in row) || row.EncounterCode === e.hisCode),
              )
              .map(async (row) => {
                const { file, ...view } = map(row, e.id);
                return file ? { ...view, fileUrl: await this.data.fileLink(ctx, file) } : view;
              }),
          );
        }),
      );
      results.push(...batch);
    }
    await this.access.audit(ctx, kind);
    return results.flat();
  }

  private async loadEncounters(ctx: Context, months: string[]): Promise<InternalEncounter[]> {
    const rows = await this.data.cached(ctx, 'encounters', months.join(','), z.array(EncounterHis), () =>
      this.data.call(
        ctx,
        'MedicalRecords/GetEncounter',
        { PatientCode: ctx.maBN, MMyy: months.join(',') },
        z.array(EncounterHis),
      ),
    );
    // MAQL của HIS có thể chứa MaBN; ID công khai phải là HMAC để URL/JSON không lộ MaBN.
    return rows.map((r) => ({
      id: this.d.pii.hmac(`${ctx.code}:${r.EncounterCode}`),
      hisCode: r.EncounterCode,
      date: fromHisDate(r.CreateDate),
      room: r.RoomName,
      doctor: r.DoctorName,
      diagnosis: r.ICDName,
    }));
  }
}
