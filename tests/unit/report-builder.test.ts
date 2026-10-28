import { describe, expect, it } from 'vitest';
import { buildReports } from '@/lib/services/records/report-builder';
import type { EncounterDetail } from '@/lib/domain/records/types';

const detail: EncounterDetail = {
  id: 'opaque-id',
  date: '2026-09-02',
  room: 'Thận nhân tạo',
  doctor: 'Bác sĩ A',
  diagnosis: 'Suy thận mạn',
  icdCode: 'N18.5',
  recordNoMasked: '****1234',
  insuranceType: true,
  tests: [
    {
      encounterId: 'opaque-id',
      date: '2026-09-02',
      name: 'WBC',
      result: '11.9',
      unit: '10^9/L',
      reference: '4.0 - 9.0',
      abnormal: true,
      group: 'Huyết học',
      sampleDate: '2026-09-02',
    },
    {
      encounterId: 'opaque-id',
      date: '2026-09-02',
      name: 'RBC',
      result: '4.2',
      unit: '10^12/L',
      reference: '3.8 - 5.3',
      abnormal: false,
      group: 'Huyết học',
    },
  ],
  imaging: [
    {
      encounterId: 'opaque-id',
      date: '2026-09-02',
      name: 'X quang phổi',
      description: 'Mô tả',
      conclusion: 'Bình thường',
    },
  ],
  prescriptions: [
    {
      encounterId: 'opaque-id',
      date: '2026-09-02',
      name: 'Thuốc A 40mg',
      quantity: '28',
      form: 'Viên',
      dosage: 'Uống sáng',
    },
  ],
};

describe('report builder', () => {
  it('groups lab rows, preserves abnormal direction and available source fields', () => {
    const reports = buildReports(
      detail,
      { name: 'Bệnh viện A', address: 'Địa chỉ A' },
      { fullName: 'Bệnh nhân A', birthYear: 1960, gender: 1, phoneMasked: '090****123' },
    );
    expect(reports.lab.groups).toHaveLength(1);
    expect(reports.lab.groups[0]?.rows[0]).toMatchObject({ name: 'WBC', abnormal: true, direction: '↑' });
    expect(reports.lab.patient).toMatchObject({
      fullName: 'Bệnh nhân A',
      gender: 'Nữ',
      icdCode: 'N18.5',
      phoneMasked: '090****123',
    });
    expect(reports.imaging.items[0]?.conclusion).toBe('Bình thường');
    expect(reports.prescription.items[0]?.activeIngredient).toBeUndefined();
    expect(JSON.stringify(reports)).not.toContain('opaque-id');
  });
});
