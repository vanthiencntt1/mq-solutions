import { AppError } from '../errors';
import type { BookingApi, IdentStatus, ObjectType, PayMethod } from './types';

/**
 * Bảng quyết định 6 nhánh đặt khám (C06 mục 2):
 *   có / chưa có MaBN × Dịch vụ / BHYT × online / tại viện → API cuối + các bước phụ.
 */
export interface BranchInput {
  ident: IdentStatus;
  hasVisited: boolean;
  objectType: ObjectType;
  payMethod: PayMethod;
  facilityAllowsBhyt: boolean;
}

export interface BranchPlan {
  branch: 1 | 2 | 3 | 4 | 5 | 6;
  api: BookingApi;
  createPatientFirst: boolean; // PostPatients trước khi đặt (bệnh nhân mới)
  checkInsurance: boolean; // PostPatients_checkbh (BHYT)
  requiresPayment: boolean; // VietQR + webhook trước khi gọi HIS
}

export function planBooking(input: BranchInput): BranchPlan {
  if (input.ident === 'MISMATCH') throw new AppError('IDENTITY_MISMATCH');

  const isNew = input.ident === 'NEW_PATIENT';
  const online = input.payMethod === 'ONLINE';
  const api: BookingApi = online ? 'PAID' : 'UNPAID';

  if (input.objectType === 'BHYT') {
    // BHYT chỉ cho bệnh nhân đã có MaBN và đã khám tại cơ sở (C05 bước 5)
    if (isNew || !input.hasVisited || !input.facilityAllowsBhyt)
      throw new AppError('BOOKING_BHYT_NOT_ALLOWED');
    return {
      branch: online ? 3 : 4,
      api,
      createPatientFirst: false,
      checkInsurance: true,
      requiresPayment: online,
    };
  }

  if (isNew) {
    return {
      branch: online ? 5 : 6,
      api,
      createPatientFirst: true,
      checkInsurance: false,
      requiresPayment: online,
    };
  }
  return {
    branch: online ? 1 : 2,
    api,
    createPatientFirst: false,
    checkInsurance: false,
    requiresPayment: online,
  };
}
