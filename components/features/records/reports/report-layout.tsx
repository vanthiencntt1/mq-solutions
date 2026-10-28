import Image from 'next/image';
import type { ReportHeader, ReportPatient } from '@/lib/domain/records/report-types';
import { formatDate } from '@/lib/utils/format';

export function ReportHeading({ header, title }: { header: ReportHeader; title: string }) {
  return (
    <header className="report-heading">
      <div className="report-heading-grid">
        <div className="flex items-start gap-3">
          {header.facilityLogoUrl && (
            <Image
              src={header.facilityLogoUrl}
              alt=""
              width={48}
              height={48}
              unoptimized
              className="size-12 object-contain"
            />
          )}
          <div>
            {header.governingBody && <p className="text-xs uppercase">{header.governingBody}</p>}
            <p className="font-bold uppercase">{header.facilityName}</p>
            {header.facilityAddress && <p className="text-xs">{header.facilityAddress}</p>}
          </div>
        </div>
        <div className="text-right text-xs tabular-nums">
          {header.reportCode && <p>Mã phiếu: {header.reportCode}</p>}
          {header.recordNoMasked && <p>Số hồ sơ: {header.recordNoMasked}</p>}
          {header.issuedAt && <p>Ngày: {formatDate(header.issuedAt)}</p>}
        </div>
      </div>
      <h1 className="my-6 text-center text-[16pt] font-bold uppercase">{title}</h1>
    </header>
  );
}

export function PatientBlock({ patient }: { patient: ReportPatient }) {
  const fields: [string, string | number | undefined][] = [
    ['Họ tên', patient.fullName],
    ['Năm sinh', patient.birthYear],
    ['Tuổi', patient.age],
    ['Giới tính', patient.gender],
    ['Số điện thoại', patient.phoneMasked],
    ['Địa chỉ', patient.address],
    [
      'Đối tượng',
      patient.insuranceType === undefined ? undefined : patient.insuranceType ? 'BHYT' : 'Dịch vụ',
    ],
    ['Số thẻ BHYT', patient.insuranceNoMasked],
    ['Hạn BHYT', patient.insuranceUntil],
    ['Khoa/phòng', patient.department],
    ['Bác sĩ chỉ định', patient.orderingDoctor],
    [
      'Chẩn đoán',
      patient.diagnosis ? `${patient.diagnosis}${patient.icdCode ? ` (${patient.icdCode})` : ''}` : undefined,
    ],
  ];
  return (
    <dl className="report-patient mb-5 grid grid-cols-1 gap-x-6 gap-y-1 border-y py-3 sm:grid-cols-2">
      {fields
        .filter(([, value]) => value !== undefined && value !== '')
        .map(([label, value]) => (
          <div key={label} className="flex gap-1">
            <dt className="shrink-0 font-semibold">{label}:</dt>
            <dd>{value}</dd>
          </div>
        ))}
    </dl>
  );
}

export function ReportSignature({ date, doctor }: { date?: string; doctor?: string }) {
  return (
    <footer className="report-signature mt-8 text-right">
      <p>{date ? `Ngày ${formatDate(date)}` : ''}</p>
      <p className="font-semibold">Bác sĩ chuyên khoa</p>
      <div className="h-12" />
      <p className="font-semibold">{doctor || ''}</p>
    </footer>
  );
}
