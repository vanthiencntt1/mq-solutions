import type { PrescriptionReport as PrescriptionReportData } from '@/lib/domain/records/report-types';
import { formatDate } from '@/lib/utils/format';
import { PatientBlock, ReportHeading, ReportSignature } from './report-layout';

export function PrescriptionReport({ report }: { report: PrescriptionReportData }) {
  return (
    <article className="report-sheet">
      <ReportHeading header={report.header} title="Toa thuốc" />
      <PatientBlock patient={report.patient} />
      <p className="mb-2 text-sm">Ngày khám: {formatDate(report.encounterDate)}</p>
      <table className="report-table w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            <th>STT</th>
            <th>TÊN THUỐC</th>
            <th>SL</th>
            <th>ĐƠN VỊ</th>
            <th>CÁCH DÙNG / LIỀU</th>
          </tr>
        </thead>
        <tbody>
          {report.items.map((item) => (
            <tr key={item.order}>
              <td className="text-right tabular-nums">{item.order}</td>
              <td>
                <b>{item.name}</b>
                {item.activeIngredient && <span className="block italic">({item.activeIngredient})</span>}
              </td>
              <td className="text-right tabular-nums">{item.quantity}</td>
              <td>{item.unit}</td>
              <td>
                {item.instructions}
                <span className="block tabular-nums">
                  {[
                    ['Sáng', item.morning],
                    ['Trưa', item.noon],
                    ['Chiều', item.afternoon],
                    ['Tối', item.evening],
                  ]
                    .filter(([, v]) => v !== undefined)
                    .map(([label, v]) => `${label}: ${v}`)
                    .join(' · ')}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ReportSignature date={report.signedAt} doctor={report.signingDoctor} />
    </article>
  );
}
