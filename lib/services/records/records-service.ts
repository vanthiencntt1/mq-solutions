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
  fromHisDate,
  inRange,
  monthsInRange,
  parseDateRange,
  parseRangeFilter,
  samePatient,
  toHisDate,
  toHisDay,
  type DateRange,
  type Encounter,
  type Imaging,
  type Prescription,
  type RangeFilter,
  type Reexam,
  type Test,
} from '@/lib/domain/records/types';
import { RecordsAccess } from './records-access';
import { RecordsData, type RecordContext as Context, type RecordKind as Kind } from './records-data';
import { loadEncounterDetail } from './records-detail';

export { RECORDS_TTL_SECONDS } from './records-data';

// C04: bản sao bệnh án chỉ nằm trong Redis, mã hóa, tối đa 30 phút theo yêu cầu đợt này.
type InternalEncounter = Encounter & { hisCode: string };
type EncounterFilter = RangeFilter & { mmyy?: string };

// Giới hạn số dòng trả về một lượt để trang không quá nặng với bệnh nhân khám nhiều năm.
const MAX_ROWS = 3000;
// HIS chưa nâng cấp: không có chế độ "toàn bộ hồ sơ" thì quét lại các tháng gần nhất như trước.
const LEGACY_MONTHS = 12;

const isOldHisReply = (err: unknown) =>
  err instanceof AppError && ['HIS_ERROR', 'RECORD_DATA_INVALID'].includes(err.code);

export class RecordsService {
  private readonly data: RecordsData;
  private readonly access: RecordsAccess;
  constructor(private readonly d: RecordsDeps) {
    this.data = new RecordsData(d);
    this.access = new RecordsAccess(d);
  }

  /** Danh sách lần khám: mặc định toàn bộ hồ sơ (btdbn.nam phía HIS); `mmyy` hoặc from/to để lọc. */
  async encounters(accountId: string, code: string, filter: EncounterFilter = {}, ipHash?: string) {
    const ctx = await this.access.context(accountId, code, ipHash);
    const mmyy = filter.mmyy ? Mmyy.parse(filter.mmyy) : undefined;
    const range = parseRangeFilter(filter);
    await this.access.limit(ctx);
    const rows = (await this.loadEncounters(ctx, mmyy))
      .filter((e) => inRange(e.date, range))
      .map(({ hisCode: _hisCode, ...view }) => view);
    await this.access.audit(ctx, 'encounters');
    return rows;
  }

  async encounter(accountId: string, code: string, id: string, ipHash?: string, mmyy?: string) {
    const ctx = await this.access.context(accountId, code, ipHash);
    const encounterId = EncounterId.parse(id);
    await this.access.limit(ctx);
    const row = (await this.loadEncounters(ctx, mmyy ? Mmyy.parse(mmyy) : undefined)).find(
      (e) => e.id === encounterId,
    );
    if (!row) throw new AppError('NOT_FOUND', 'Không tìm thấy lần khám');
    const { hisCode, ...view } = row;
    const detail = await loadEncounterDetail(this.data, ctx, view, hisCode, this.d.now());
    await this.access.audit(ctx, 'encounter-detail');
    return detail;
  }

  async tests(accountId: string, code: string, filter: RangeFilter, ipHash?: string): Promise<Test[]> {
    return this.allRecords(
      'tests',
      accountId,
      code,
      filter,
      TestHis,
      'MedicalRecords/GetTestResults',
      (r, id) => ({
        encounterId: id,
        date: fromHisDate(r.ReturnDate),
        name: r.ResultName || r.SymptonName,
        result: r.Result,
        unit: r.Unit,
        reference: r.UsualIndex,
        abnormal: r.Note === 'H' || r.Note === 'L' || (r.batthuong !== '' && r.batthuong !== '0'),
        file: r.Base64String,
      }),
      ipHash,
    );
  }

  async imaging(accountId: string, code: string, filter: RangeFilter, ipHash?: string): Promise<Imaging[]> {
    return this.allRecords(
      'imaging',
      accountId,
      code,
      filter,
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
    filter: RangeFilter,
    ipHash?: string,
  ): Promise<Prescription[]> {
    return this.allRecords(
      'prescriptions',
      accountId,
      code,
      filter,
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
            RequestTime: toHisDate(today),
          },
          z.array(ReexamHis),
        ),
    );
    const view = rows
      .filter((r) => samePatient(r.PatientCode, ctx.maBN))
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

  /**
   * Xét nghiệm / CĐHA / thuốc của toàn bộ hồ sơ: 1 lần gọi HIS, không gửi EncounterCode/lstMMyy
   * (ApiDatKham tự lấy các tháng trong btdbn.nam). HIS cũ từ chối kiểu gọi này thì tra theo từng lần khám.
   */
  private async allRecords<T extends z.ZodRawShape, V extends { encounterId: string; file?: string }>(
    kind: Kind,
    accountId: string,
    code: string,
    filter: RangeFilter,
    schema: z.ZodObject<T>,
    path: string,
    map: (r: z.infer<z.ZodObject<T>>, id: string) => V,
    ipHash?: string,
  ): Promise<(Omit<V, 'file'> & { fileUrl?: string })[]> {
    const ctx = await this.access.context(accountId, code, ipHash);
    const range = parseRangeFilter(filter);
    await this.access.limit(ctx);
    const rows = await this.data.cached(ctx, kind, 'all', z.array(schema), async () => {
      try {
        return await this.data.call(ctx, path, { PatientCode: ctx.maBN }, z.array(schema));
      } catch (err) {
        if (!isOldHisReply(err)) throw err;
        return this.legacyByEncounter(ctx, path, schema);
      }
    });
    const result: (Omit<V, 'file'> & { fileUrl?: string })[] = [];
    for (const row of rows) {
      const r = row as z.infer<z.ZodObject<T>> & { PatientCode?: string; EncounterCode?: string };
      if (!samePatient(r.PatientCode, ctx.maBN)) continue;
      // MAQL của HIS có thể chứa MaBN; ID công khai phải là HMAC để URL/JSON không lộ MaBN.
      const id = r.EncounterCode ? this.d.pii.hmac(`${ctx.code}:${r.EncounterCode}`) : '';
      const { file, ...view } = map(r, id);
      if (!inRange((view as { date?: string }).date ?? '', range)) continue;
      result.push(file ? { ...view, fileUrl: await this.data.fileLink(ctx, file) } : view);
      if (result.length >= MAX_ROWS) break;
    }
    await this.access.audit(ctx, kind);
    return result;
  }

  /** HIS chưa nâng cấp: gọi theo từng lần khám bằng dạng body bản cũ hiểu được (EncounterCode + yyyymmdd). */
  private async legacyByEncounter<T extends z.ZodRawShape>(
    ctx: Context,
    path: string,
    schema: z.ZodObject<T>,
  ): Promise<z.infer<z.ZodObject<T>>[]> {
    const encounters = (await this.loadEncounters(ctx)).slice(0, 100);
    const today = toHisDay(this.d.now().toISOString());
    const out: z.infer<z.ZodObject<T>>[] = [];
    // Mỗi đợt tối đa 5 lần khám để không dồn hàng trăm request lên một ApiDatKham.
    for (let i = 0; i < encounters.length; i += 5) {
      const batch = await Promise.all(
        encounters.slice(i, i + 5).map(async (e) =>
          (
            await this.data.call(
              ctx,
              path,
              {
                PatientCode: ctx.maBN,
                EncounterCode: e.hisCode,
                FromDate: toHisDay(e.date),
                ToDate: today,
                RequestTime: today,
              },
              z.array(schema),
            )
          )
            .filter((row) => {
              const r = row as { EncounterCode?: string };
              return !r.EncounterCode || r.EncounterCode === e.hisCode;
            })
            // Thuốc ở HIS cũ không có EncounterCode nhưng SQL đã lọc theo MAQL này
            .map((row) => ({
              ...row,
              EncounterCode: (row as { EncounterCode?: string }).EncounterCode ?? e.hisCode,
            })),
        ),
      );
      out.push(...batch.flat());
    }
    return out;
  }

  private async loadEncounters(ctx: Context, mmyy?: string): Promise<InternalEncounter[]> {
    let rows: z.infer<typeof EncounterHis>[];
    if (mmyy) {
      rows = await this.monthEncounters(ctx, mmyy);
    } else {
      // MMyy rỗng: ApiDatKham đọc btdbn.nam và gộp mọi tháng có dữ liệu trong 1 truy vấn.
      try {
        rows = await this.data.cached(ctx, 'encounters', 'all', z.array(EncounterHis), () =>
          this.data.call(
            ctx,
            'MedicalRecords/GetEncounter',
            { PatientCode: ctx.maBN, MMyy: '' },
            z.array(EncounterHis),
          ),
        );
      } catch (err) {
        if (!isOldHisReply(err)) throw err;
        rows = [];
      }
      if (rows.length === 0) rows = await this.legacyMonths(ctx);
    }
    const unique = [...new Map(rows.map((r) => [r.EncounterCode, r])).values()];
    return unique
      .map((r) => ({
        id: this.d.pii.hmac(`${ctx.code}:${r.EncounterCode}`),
        hisCode: r.EncounterCode,
        date: fromHisDate(r.CreateDate),
        sort: r.CreateDate,
        room: r.RoomName,
        doctor: r.DoctorName,
        diagnosis: r.ICDName,
        icdCode: r.ICDCode || undefined,
        recordNoMasked:
          r.Medical_number && r.Medical_number !== '0' ? `****${r.Medical_number.slice(-4)}` : undefined,
        insuranceType: r.isbhyt == null ? undefined : String(r.isbhyt) === '1',
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || b.sort.localeCompare(a.sort))
      .map(({ sort: _sort, ...e }) => e);
  }

  private monthEncounters(ctx: Context, month: string) {
    return this.data.cached(ctx, 'encounters', month, z.array(EncounterHis), () =>
      this.data.call(
        ctx,
        'MedicalRecords/GetEncounter',
        { PatientCode: ctx.maBN, MMyy: month },
        z.array(EncounterHis),
      ),
    );
  }

  /**
   * HIS chưa nâng cấp (MMyy rỗng không trả gì): quét từng tháng gần nhất như trước.
   * HIS ghép các tháng bằng UNION; thiếu một bảng tháng là cả truy vấn rỗng, nên gọi từng tháng (tối đa 4 song song).
   */
  private async legacyMonths(ctx: Context): Promise<z.infer<typeof EncounterHis>[]> {
    const months = monthsInRange(parseDateRange({}, this.d.now())).slice(-LEGACY_MONTHS);
    const rows: z.infer<typeof EncounterHis>[] = [];
    let firstError: unknown;
    let failed = 0;
    for (let i = 0; i < months.length; i += 4) {
      const batch = await Promise.all(
        months.slice(i, i + 4).map((month) =>
          this.monthEncounters(ctx, month).catch((err: unknown) => {
            // Một tháng lỗi vẫn hiện các tháng còn lại; chỉ báo lỗi khi mọi tháng đều lỗi.
            firstError ??= err;
            failed++;
            return [];
          }),
        ),
      );
      rows.push(...batch.flat());
    }
    if (months.length > 0 && failed === months.length) throw firstError;
    return rows;
  }
}
