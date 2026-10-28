export type ReportType = 'lab' | 'imaging' | 'prescription';

export interface ReportHeader {
  facilityName: string;
  facilityAddress?: string;
  facilityLogoUrl?: string | null;
  governingBody?: string;
  reportCode?: string;
  recordNoMasked?: string;
  issuedAt?: string;
}

export interface ReportPatient {
  fullName?: string;
  birthYear?: number;
  age?: number;
  gender?: string;
  address?: string;
  phoneMasked?: string;
  insuranceNoMasked?: string;
  insuranceUntil?: string;
  insuranceType?: boolean;
  department?: string;
  orderingDoctor?: string;
  diagnosis?: string;
  icdCode?: string;
}

export interface ReportBase {
  type: ReportType;
  header: ReportHeader;
  patient: ReportPatient;
  encounterDate: string;
  signedAt?: string;
  signingDoctor?: string;
}
export interface LabReport extends ReportBase {
  type: 'lab';
  sampleDate?: string;
  groups: {
    name?: string;
    rows: {
      order: number;
      name: string;
      result: string;
      unit?: string;
      reference?: string;
      device?: string;
      abnormal: boolean;
      direction?: '↑' | '↓' | '!';
    }[];
  }[];
}
export interface ImagingReport extends ReportBase {
  type: 'imaging';
  items: {
    name: string;
    typeName?: string;
    machine?: string;
    bodyPart?: string;
    description?: string;
    conclusion?: string;
    date?: string;
    fileUrl?: string;
  }[];
}
export interface PrescriptionReport extends ReportBase {
  type: 'prescription';
  items: {
    order: number;
    name: string;
    activeIngredient?: string;
    quantity?: string;
    unit?: string;
    instructions?: string;
    morning?: string;
    noon?: string;
    afternoon?: string;
    evening?: string;
  }[];
}
export type MedicalReport = LabReport | ImagingReport | PrescriptionReport;
