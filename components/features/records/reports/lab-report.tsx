import type { LabReport as LabReportData } from '@/lib/domain/records/report-types';
import { formatDate } from '@/lib/utils/format';
import { PatientBlock, ReportHeading, ReportSignature } from './report-layout';

export function LabReport({ report }: { report: LabReportData }) {
  return (
    <article className="report-sheet">
      <ReportHeading header={report.header} title="Phiếu kết quả xét nghiệm" />
      <PatientBlock patient={report.patient} />
      <p className="mb-2 text-sm">Ngày khám: {formatDate(report.encounterDate)}</p>
      {report.sampleDate && <p className="mb-2 text-sm">Ngày lấy mẫu: {report.sampleDate}</p>}
      <table className="report-table w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th>STT</th>
            <th>TÊN XÉT NGHIỆM</th>
            <th>KẾT QUẢ</th>
            <th>ĐƠN VỊ</th>
            <th>THAM CHIẾU</th>
            <th>THIẾT BỊ</th>
          </tr>
        </thead>
        {report.groups.map((group, i) => (
          <tbody key={i}>
            {group.name && (
              <tr className="report-group">
                <th colSpan={6}>{group.name.toUpperCase()}</th>
              </tr>
            )}
            {group.rows.map((row) => (
              <tr key={row.order}>
                <td className="text-right tabular-nums">{row.order}</td>
                <td>{row.name}</td>
                <td className={`tabular-nums ${row.abnormal ? 'text-danger font-bold' : ''}`}>
                  {row.direction} {row.result}
                </td>
                <td>{row.unit}</td>
                <td>{row.reference}</td>
                <td>{row.device}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      <ReportSignature date={report.signedAt} doctor={report.signingDoctor} />
    </article>
  );
}
