import type { EncounterDetail } from '@/lib/domain/records/types';
import type {
  ImagingReport,
  LabReport,
  MedicalReport,
  PrescriptionReport,
  ReportHeader,
  ReportPatient,
  ReportType,
} from '@/lib/domain/records/report-types';

export interface ReportFacility {
  name: string;
  address?: string;
  logoUrl?: string | null;
  governingBody?: string;
}
export interface ReportAccount {
  fullName?: string;
  birthYear?: number;
  gender?: number;
  addressLine?: string;
  phoneMasked?: string;
  insuranceNoMasked?: string;
  insuranceUntil?: string;
}

function direction(result: string, reference: string): '↑' | '↓' | '!' {
  const value = Number(result.replace(',', '.'));
  const bounds = reference.match(/-?\d+(?:[.,]\d+)?/g)?.map((v) => Number(v.replace(',', '.'))) ?? [];
  if (!Number.isNaN(value) && bounds.length >= 2) {
    if (value < bounds[0]!) return '↓';
    if (value > bounds[1]!) return '↑';
  }
  return '!';
}

/** Không phát sinh dữ liệu thiếu từ HIS; số định danh chỉ dùng dạng đã che. */
export function buildReports(
  detail: EncounterDetail,
  facility: ReportFacility,
  account: ReportAccount,
): {
  lab: LabReport;
  imaging: ImagingReport;
  prescription: PrescriptionReport;
} {
  const header: ReportHeader = {
    facilityName: facility.name,
    facilityAddress: facility.address,
    facilityLogoUrl: facility.logoUrl,
    governingBody: facility.governingBody,
    recordNoMasked: detail.recordNoMasked,
  };
  const patient: ReportPatient = {
    fullName: account.fullName,
    birthYear: account.birthYear,
    gender: account.gender === 0 ? 'Nam' : account.gender === 1 ? 'Nữ' : undefined,
    address: account.addressLine,
    phoneMasked: account.phoneMasked,
    insuranceNoMasked: account.insuranceNoMasked,
    insuranceUntil: account.insuranceUntil,
    insuranceType: detail.insuranceType,
    department: detail.room,
    diagnosis: detail.diagnosis,
    icdCode: detail.icdCode,
  };
  const base = { header, patient, encounterDate: detail.date };
  const groups = new Map<string, LabReport['groups'][number]>();
  detail.tests.forEach((test, index) => {
    const name = test.group || '';
    if (!groups.has(name)) groups.set(name, { name: name || undefined, rows: [] });
    groups.get(name)!.rows.push({
      order: index + 1,
      name: test.name,
      result: test.result,
      unit: test.unit || undefined,
      reference: test.reference || undefined,
      device: test.device,
      abnormal: test.abnormal,
      direction: test.abnormal ? direction(test.result, test.reference) : undefined,
    });
  });
  return {
    lab: {
      ...base,
      type: 'lab',
      sampleDate: detail.tests.find((r) => r.sampleDate)?.sampleDate,
      groups: [...groups.values()],
    },
    imaging: {
      ...base,
      type: 'imaging',
      items: detail.imaging.map((r) => ({
        name: r.name,
        typeName: r.typeName,
        machine: r.machine,
        description: r.description,
        conclusion: r.conclusion,
        date: r.date,
        fileUrl: r.fileUrl,
      })),
    },
    prescription: {
      ...base,
      type: 'prescription',
      items: detail.prescriptions.map((r, i) => ({
        order: i + 1,
        name: r.name,
        activeIngredient: r.activeIngredient,
        quantity: r.quantity,
        unit: r.form,
        instructions: r.dosage,
        morning: r.morning,
        noon: r.noon,
        afternoon: r.afternoon,
        evening: r.evening,
      })),
    },
  };
}

export function pickReport(reports: ReturnType<typeof buildReports>, type: ReportType): MedicalReport {
  return reports[type];
}
