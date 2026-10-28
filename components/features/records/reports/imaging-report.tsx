import type { ImagingReport as ImagingReportData } from '@/lib/domain/records/report-types';
import { formatDate } from '@/lib/utils/format';
import { PatientBlock, ReportHeading, ReportSignature } from './report-layout';

export function ImagingReport({ report }: { report: ImagingReportData }) {
  const isXray = report.items.some((item) => /x\s*quang/i.test(`${item.typeName || ''} ${item.name}`));
  return (
    <article className="report-sheet">
      <ReportHeading
        header={report.header}
        title={isXray ? 'Phiếu kết quả X quang' : 'Phiếu kết quả chẩn đoán hình ảnh'}
      />
      <PatientBlock patient={report.patient} />
      <p className="mb-2 text-sm">Ngày khám: {formatDate(report.encounterDate)}</p>
      {report.items.map((item, i) => (
        <section key={i} className="report-item mb-5 space-y-2">
          <h2 className="border-b pb-1 text-base font-bold">
            {i + 1}. {item.name}
          </h2>
          {item.machine && (
            <p>
              <b>Tên máy:</b> {item.machine}
            </p>
          )}
          {item.bodyPart && (
            <p>
              <b>Bộ phận khảo sát:</b> {item.bodyPart}
            </p>
          )}
          {item.description && (
            <div>
              <b>Mô tả hình ảnh:</b>
              <p className="whitespace-pre-line">{item.description}</p>
            </div>
          )}
          <p className="font-semibold">
            <b>Kết luận:</b> {item.conclusion || 'Chưa có'}
          </p>
        </section>
      ))}
      <ReportSignature date={report.signedAt} doctor={report.signingDoctor} />
    </article>
  );
}
