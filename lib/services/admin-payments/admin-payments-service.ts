import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS } from '@/lib/domain/admin/permissions';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { formatMoney } from '@/lib/utils/format';
import type { PaymentQuery, PaymentRepository, PaymentRow } from './types';

const APPROVAL_THRESHOLD = 2_000_000;

export class AdminPaymentsService {
  constructor(
    private readonly repo: PaymentRepository,
    private readonly queueRefundEmail: (to: string, vars: Record<string, string>) => Promise<void>,
  ) {}

  list(actor: AdminPrincipal, query: PaymentQuery) {
    this.require(actor, PERMISSIONS.PAYMENT_READ);
    this.checkScope(actor, query.facilityId);
    return this.repo.list(query, actor.facilityIds);
  }

  facilities(actor: AdminPrincipal) {
    this.require(actor, PERMISSIONS.PAYMENT_READ);
    return this.repo.facilities(actor.facilityIds);
  }

  async match(actor: AdminPrincipal, id: string, appointmentCode: string) {
    this.require(actor, PERMISSIONS.REFUND_CREATE);
    await this.find(actor, id);
    return this.repo.match(id, appointmentCode, actor.id, actor.facilityIds);
  }

  async requestRefund(actor: AdminPrincipal, id: string, amount: number, note: string) {
    this.require(actor, PERMISSIONS.REFUND_CREATE);
    const payment = await this.find(actor, id);
    if (
      !['PAID', 'AMOUNT_MISMATCH', 'UNMATCHED', 'REFUND_PENDING'].includes(payment.status) ||
      payment.refundRef ||
      (payment.status === 'REFUND_PENDING' && payment.refundBy) ||
      (payment.status === 'PAID' && !['CHO_HOAN_TIEN', 'DA_HUY'].includes(payment.appointmentStatus ?? ''))
    )
      throw new AppError('A07_REFUND_STATE');
    if (amount > (payment.paidAmount ?? 0)) throw new AppError('A07_REFUND_AMOUNT');
    if (amount < (payment.paidAmount ?? 0) && payment.status !== 'AMOUNT_MISMATCH')
      throw new AppError('A07_REFUND_AMOUNT');
    if (
      payment.status === 'AMOUNT_MISMATCH' &&
      payment.appointmentCode &&
      amount !== payment.paidAmount! - payment.amount &&
      amount !== payment.paidAmount
    )
      throw new AppError('A07_REFUND_AMOUNT');
    return this.repo.requestRefund(id, amount, note, actor.id, actor.facilityIds);
  }

  async approveRefund(actor: AdminPrincipal, id: string) {
    this.require(actor, PERMISSIONS.REFUND_APPROVE);
    const payment = await this.find(actor, id);
    const request = await this.repo.refundRequest(id);
    if (payment.status !== 'REFUND_PENDING' || !request) throw new AppError('A07_REFUND_STATE');
    if (payment.refundBy === actor.id) throw new AppError('A07_REFUND_TWO_PERSON');
    return this.repo.approveRefund(id, actor.id, actor.facilityIds);
  }

  async completeRefund(
    actor: AdminPrincipal,
    id: string,
    input: { refundedAt: string; refundRef: string; note?: string },
  ) {
    this.require(actor, PERMISSIONS.REFUND_CREATE);
    const payment = await this.find(actor, id);
    const request = await this.repo.refundRequest(id);
    if (payment.status !== 'REFUND_PENDING' || !request) throw new AppError('A07_REFUND_STATE');
    if (
      request.amount > APPROVAL_THRESHOLD &&
      (!payment.refundApprovedBy || payment.refundApprovedBy === payment.refundBy)
    )
      throw new AppError('A07_REFUND_APPROVAL_REQUIRED');
    const refundedAt = new Date(input.refundedAt);
    if (refundedAt > new Date()) throw new AppError('VALIDATION_FAILED');
    const completed = await this.repo.completeRefund(
      id,
      { ...input, refundedAt, amount: request.amount },
      actor.id,
      actor.facilityIds,
    );
    const email = await this.repo.refundEmail(id, actor.facilityIds);
    if (email)
      await this.queueRefundEmail(email, {
        soTien: formatMoney(request.amount),
        maGiaoDich: input.refundRef,
      });
    return completed;
  }

  async csv(actor: AdminPrincipal, query: PaymentQuery): Promise<string> {
    this.require(actor, PERMISSIONS.PAYMENT_READ);
    this.checkScope(actor, query.facilityId);
    const rows: PaymentRow[] = [];
    for (let page = 1; page <= 100; page++) {
      const batch = await this.repo.list({ ...query, page, pageSize: 100 }, actor.facilityIds);
      rows.push(...batch.rows);
      if (rows.length >= batch.total) break;
    }
    const cell = (value: string | number | null) => {
      const raw = String(value ?? '');
      const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${safe.replaceAll('"', '""')}"`;
    };
    const lines = [
      ['Thời gian', 'Cơ sở', 'Mã đơn', 'Mã giao dịch', 'Số tiền', 'Thực nhận', 'Trạng thái', 'Phiếu'].join(
        ',',
      ),
    ];
    for (const row of rows)
      lines.push(
        [
          row.paidAt?.toISOString() ?? row.createdAt.toISOString(),
          row.facilityName,
          row.orderCode,
          row.providerTxnId,
          row.amount,
          row.paidAmount,
          row.status,
          row.appointmentCode,
        ]
          .map(cell)
          .join(','),
      );
    return `\uFEFF${lines.join('\r\n')}\r\n`;
  }

  private async find(actor: AdminPrincipal, id: string) {
    const row = await this.repo.find(id, actor.facilityIds);
    if (!row) throw new AppError('NOT_FOUND');
    return row;
  }

  private checkScope(actor: AdminPrincipal, facilityId?: string) {
    if (facilityId && actor.facilityIds !== null && !actor.facilityIds.includes(facilityId))
      throw new AppError('FORBIDDEN');
  }

  private require(
    actor: AdminPrincipal,
    permission:
      typeof PERMISSIONS.PAYMENT_READ | typeof PERMISSIONS.REFUND_CREATE | typeof PERMISSIONS.REFUND_APPROVE,
  ) {
    if (!can({ name: actor.role, permissions: actor.permissions }, permission))
      throw new AppError('FORBIDDEN');
  }
}
