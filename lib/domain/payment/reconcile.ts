// C09 mục 4: so khớp bằng khóa lịch HIS, không mang dữ liệu bệnh nhân vào kết quả đối soát.
export interface WebBooking {
  id: string;
  code: string;
  hisId: string;
  hisBookingId: string | null;
  bookingApi: 'PAID' | 'UNPAID';
  payMethod: 'ONLINE' | 'AT_FACILITY';
  status: string;
  stt: number | null;
  amount: number;
  paymentStatus: string | null;
  paidAmount: number | null;
}

export interface HisBooking {
  key: string;
  bookingId: string | null;
  kind: 'PAID' | 'UNPAID';
  stt: number | null;
  amount: number | null;
  status: number | null;
}

export type ReconcileIssueKind =
  | 'MISSING_IN_HIS'
  | 'MISSING_IN_WEB'
  | 'STT_MISMATCH'
  | 'AMOUNT_MISMATCH'
  | 'HIS_STATUS_CHANGED'
  | 'PAYMENT_MISMATCH';

export interface ReconcileIssue {
  kind: ReconcileIssueKind;
  appointmentId?: string;
  appointmentCode?: string;
  hisKey?: string;
  webValue?: number | string;
  hisValue?: number | string;
}

export interface ReconcileAction {
  appointmentId: string;
  reconciled: boolean;
  stt?: number;
  status?: 'DA_HUY' | 'CHO_HOAN_TIEN' | 'LOI_HIS';
  enqueueOutbox?: boolean;
}

export interface ReconcileResult {
  matched: number;
  missingInHis: number;
  missingInWeb: number;
  statusChanged: number;
  amountDiff: number;
  issues: ReconcileIssue[];
  actions: ReconcileAction[];
}

const notSent = new Set(['CHO_THANH_TOAN', 'QUA_HAN', 'DA_HUY', 'DA_HOAN_TIEN']);

export function reconcileBookings(web: WebBooking[], his: HisBooking[]): ReconcileResult {
  const result: ReconcileResult = {
    matched: 0,
    missingInHis: 0,
    missingInWeb: 0,
    statusChanged: 0,
    amountDiff: 0,
    issues: [],
    actions: [],
  };
  const remaining = new Set(his);
  for (const booking of web) {
    // C09 mục 4: một lịch HIS chỉ được ghép với một phiếu web.
    const found = [...remaining].find(
      (item) =>
        item.kind === booking.bookingApi &&
        (item.key === booking.hisId ||
          (booking.hisBookingId !== null && item.bookingId === booking.hisBookingId)),
    );
    if (!found) {
      if (!notSent.has(booking.status)) {
        result.missingInHis++;
        result.issues.push({
          kind: 'MISSING_IN_HIS',
          appointmentId: booking.id,
          appointmentCode: booking.code,
        });
        result.actions.push({
          appointmentId: booking.id,
          reconciled: false,
          status: booking.payMethod === 'ONLINE' ? 'LOI_HIS' : undefined,
          enqueueOutbox: booking.payMethod === 'ONLINE',
        });
      }
      continue;
    }
    remaining.delete(found);
    const action: ReconcileAction = { appointmentId: booking.id, reconciled: true };
    let changed = false;
    // ApiDatKham BookingInfo.status=2 là "đã hoàn trả"; không tự xác nhận hoàn ngân hàng.
    if (
      found.kind === 'PAID' &&
      found.status === 2 &&
      booking.status !== 'DA_HUY' &&
      booking.status !== 'DA_HOAN_TIEN'
    ) {
      action.status = booking.payMethod === 'ONLINE' ? 'CHO_HOAN_TIEN' : 'DA_HUY';
      result.statusChanged++;
      result.issues.push({
        kind: 'HIS_STATUS_CHANGED',
        appointmentId: booking.id,
        appointmentCode: booking.code,
      });
      changed = true;
    }
    if (found.stt !== null && found.stt !== booking.stt) {
      action.stt = found.stt;
      result.issues.push({
        kind: 'STT_MISMATCH',
        appointmentId: booking.id,
        appointmentCode: booking.code,
        webValue: booking.stt ?? '—',
        hisValue: found.stt,
      });
      changed = true;
    }
    if (found.amount !== null && found.amount !== booking.amount) {
      result.amountDiff++;
      result.issues.push({
        kind: 'AMOUNT_MISMATCH',
        appointmentId: booking.id,
        appointmentCode: booking.code,
        webValue: booking.amount,
        hisValue: found.amount,
      });
      changed = true;
    }
    if (
      booking.payMethod === 'ONLINE' &&
      booking.paymentStatus === 'PAID' &&
      booking.paidAmount !== booking.amount
    ) {
      result.issues.push({
        kind: 'PAYMENT_MISMATCH',
        appointmentId: booking.id,
        appointmentCode: booking.code,
        webValue: booking.paidAmount ?? 0,
        hisValue: booking.amount,
      });
      changed = true;
    }
    if (!changed) result.matched++;
    result.actions.push(action);
  }
  for (const item of remaining) {
    result.missingInWeb++;
    result.issues.push({ kind: 'MISSING_IN_WEB', hisKey: item.key });
  }
  return result;
}
