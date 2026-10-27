import { describe, expect, it } from 'vitest';
import { planBooking } from '@/lib/domain/booking/branch';

const base = { hasVisited: true, facilityAllowsBhyt: true } as const;

describe('planBooking – 6 nhánh C06', () => {
  it.each([
    ['FOUND', 'DICH_VU', 'ONLINE', 1, 'PAID'],
    ['FOUND', 'DICH_VU', 'AT_FACILITY', 2, 'UNPAID'],
    ['FOUND', 'BHYT', 'ONLINE', 3, 'PAID'],
    ['FOUND', 'BHYT', 'AT_FACILITY', 4, 'UNPAID'],
    ['NEW_PATIENT', 'DICH_VU', 'ONLINE', 5, 'PAID'],
    ['NEW_PATIENT', 'DICH_VU', 'AT_FACILITY', 6, 'UNPAID'],
  ] as const)('%s + %s + %s → nhánh %i (%s)', (ident, objectType, payMethod, branch, api) => {
    const plan = planBooking({ ...base, ident, objectType, payMethod });
    expect(plan.branch).toBe(branch);
    expect(plan.api).toBe(api);
    expect(plan.createPatientFirst).toBe(ident === 'NEW_PATIENT');
    expect(plan.checkInsurance).toBe(objectType === 'BHYT');
  });

  it('bệnh nhân mới không được BHYT', () => {
    expect(() =>
      planBooking({ ...base, ident: 'NEW_PATIENT', objectType: 'BHYT', payMethod: 'ONLINE' }),
    ).toThrow(/BHYT/);
  });

  it('chưa từng khám tại cơ sở không được BHYT', () => {
    expect(() =>
      planBooking({
        ...base,
        hasVisited: false,
        ident: 'FOUND',
        objectType: 'BHYT',
        payMethod: 'AT_FACILITY',
      }),
    ).toThrow();
  });

  it('lệch thông tin → không cho đặt', () => {
    expect(() =>
      planBooking({ ...base, ident: 'MISMATCH', objectType: 'DICH_VU', payMethod: 'ONLINE' }),
    ).toThrow(/quầy/);
  });
});
