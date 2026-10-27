import { formatInTimeZone } from 'date-fns-tz';
import { AppError } from '@/lib/domain/errors';
import { can, PERMISSIONS, type Permission } from '@/lib/domain/admin/permissions';
import type {
  AdminAppointmentDetail,
  AdminAppointmentRepository,
  AdminAppointmentRow,
  HisGateway,
} from '@/lib/domain/ports';
import type { AdminPrincipal } from '@/lib/services/admin-auth';
import { cancelResultSchema, unpaidBookingSchema } from '@/lib/services/ticket/his-schemas';
import { maskMaBN, maskName } from '@/lib/utils/format';
import type { AppointmentAction, AppointmentQuery } from './schemas';

export interface AdminAppointmentsDeps {
  repo: AdminAppointmentRepository;
  sign(code: string): string;
  verify(token: string): string | null;
  queueTicketEmail(to: string, vars: Record<string, string>): Promise<void>;
  his: HisGateway;
  withCancelLock<T>(code: string, action: () => Promise<T>): Promise<T>;
  resolveMaBN(accountId: string, facilityCode: string): Promise<string | null>;
  now(): Date;
}

function requireRight(actor: AdminPrincipal, permission: Permission) {
  if (!can({ name: actor.role, permissions: actor.permissions }, permission)) throw new AppError('FORBIDDEN');
}

function present(row: AdminAppointmentRow) {
  const { patientName, maBN, accountId: _accountId, ...rest } = row;
  return {
    ...rest,
    patientName: maskName(patientName),
    maBN: maBN ? maskMaBN(maBN) : null,
    examDate: row.examDate.toISOString().slice(0, 10),
    checkedInAt: row.checkedInAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

function safeCsv(value: string | number | null | undefined): string {
  const raw = String(value ?? '');
  // A06 mục 4: tránh công thức Excel khi dữ liệu từ HIS hoặc tên cơ sở bắt đầu bằng ký tự điều khiển.
  const clean = /^[\s\u0000-\u001f]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${clean.replaceAll('"', '""')}"`;
}

export class AdminAppointmentsService {
  constructor(private readonly d: AdminAppointmentsDeps) {}

  private async requireRow(actor: AdminPrincipal, code: string) {
    const row = await this.d.repo.find(code, actor.facilityIds);
    if (!row) throw new AppError('NOT_FOUND');
    return row;
  }

  facilities(actor: AdminPrincipal) {
    requireRight(actor, PERMISSIONS.APPOINTMENT_READ);
    return this.d.repo.facilities(actor.facilityIds);
  }

  async list(actor: AdminPrincipal, query: AppointmentQuery) {
    requireRight(actor, PERMISSIONS.APPOINTMENT_READ);
    if (query.facilityId && actor.facilityIds !== null && !actor.facilityIds.includes(query.facilityId))
      throw new AppError('FORBIDDEN');
    const result = await this.d.repo.list({
      ...query,
      // A06 mục 4: cờ lỗi HIS luôn chọn đúng vòng đời LOI_HIS, kể cả khi URL có status khác.
      status: query.hasHisError ? 'LOI_HIS' : query.status,
      facilityIds: actor.facilityIds,
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return {
      rows: result.rows.map(present),
      total: result.total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  async detail(actor: AdminPrincipal, code: string) {
    requireRight(actor, PERMISSIONS.APPOINTMENT_READ);
    const row = await this.requireRow(actor, code);
    await this.d.repo.auditView(code, actor.id, row.facilityId);
    return {
      ...present(row),
      events: row.events.map((event) => ({ ...event, at: event.at.toISOString() })),
      outbox: row.outbox.map((item) => ({
        ...item,
        nextRunAt: item.nextRunAt.toISOString(),
        doneAt: item.doneAt?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
      })),
      qrToken: this.d.sign(code),
    };
  }

  async action(actor: AdminPrincipal, code: string, input: AppointmentAction) {
    requireRight(
      actor,
      input.action === 'confirm-cancel' || input.action === 'cancel'
        ? PERMISSIONS.APPOINTMENT_CANCEL
        : PERMISSIONS.APPOINTMENT_READ,
    );
    const row = await this.requireRow(actor, code);
    const at = this.d.now();
    let requested = false;
    if (input.action === 'retry') {
      if (row.status !== 'LOI_HIS') throw new AppError('A06_RETRY_NOT_ALLOWED');
      await this.d.repo.retry(code, actor.id, at);
    } else if (input.action === 'resend') {
      if (!['DA_CO_STT', 'DA_KHAM'].includes(row.status) || row.stt === null)
        throw new AppError('BOOKING_IN_PROGRESS', 'Phiếu chưa có STT để gửi lại');
      const to = await this.d.repo.email(code);
      if (!to) throw new AppError('NOT_FOUND');
      await this.d.queueTicketEmail(to, {
        phieuKham: code,
        stt: String(row.stt),
        qr: this.d.sign(code),
        huongDan: `/tai-khoan/phieu-kham/${code}`,
        quyDinhHuy: 'Liên hệ cơ sở để được hướng dẫn hủy hoặc hoàn tiền.',
      });
      await this.d.repo.auditResend(code, actor.id, row.facilityId);
    } else if (input.action === 'note') {
      await this.d.repo.note(code, actor.id, input.note);
    } else if (input.action === 'confirm-cancel') {
      if (!row.cancelRequest) throw new AppError('A06_CANCEL_REQUEST_REQUIRED');
      await this.d.repo.confirmCancel(code, actor.id, at, input.note);
    } else if (input.action === 'cancel') {
      requested = await this.cancel(actor, row, input.note);
    } else {
      if (!['LOI_HIS', 'DANG_GUI_HIS'].includes(row.status)) throw new AppError('A06_RETRY_NOT_ALLOWED');
      await this.d.repo.setStt(code, actor.id, input.stt, input.hisBookingId, at);
    }
    return { code, action: input.action, requested };
  }

  private async cancel(actor: AdminPrincipal, row: AdminAppointmentDetail, note: string) {
    return this.d.withCancelLock(row.code, async () => {
      const current = await this.requireRow(actor, row.code);
      if (current.status !== 'DA_CO_STT' || !current.hisBookingId || current.cancelRequest)
        throw new AppError('CANCEL_NOT_ALLOWED');
      const path = current.bookingApi === 'PAID' ? 'Booking/Delbooking' : 'Booking/Delbooking_Unpaid';
      const body =
        current.bookingApi === 'PAID' ? { ID: current.hisBookingId } : { IDDK: current.hisBookingId };
      try {
        cancelResultSchema.parse(await this.d.his.call<unknown>(current.facilityId, path, body));
      } catch (err) {
        if (err instanceof AppError && err.code === 'CANCEL_PAID_NOT_ALLOWED') {
          await this.d.repo.requestCancel(row.code, actor.id, this.d.now(), note);
          return true;
        }
        const alreadyCancelled =
          err instanceof AppError &&
          typeof err.details === 'object' &&
          err.details !== null &&
          'hisCode' in err.details &&
          err.details.hisCode === '-45';
        // C08 mục 4: Delbooking_Unpaid trả IDDK rõ, HisClient có thể lỗi giải mã; tra lại HIS trước khi ghi đã hủy.
        const confirmedUnpaid =
          current.bookingApi === 'UNPAID' && !(err instanceof AppError) && (await this.unpaidGone(current));
        if (!alreadyCancelled && !confirmedUnpaid) throw err;
      }
      await this.d.repo.cancel(row.code, actor.id, this.d.now(), note);
      return false;
    });
  }

  private async unpaidGone(row: AdminAppointmentDetail): Promise<boolean> {
    const maBN = await this.d.resolveMaBN(row.accountId, row.facilityCode);
    if (!maBN || maBN !== row.maBN) throw new AppError('IDENTITY_MISMATCH');
    try {
      const raw = await this.d.his.call<unknown>(row.facilityId, 'Booking/GetBooking_Unpaid', {
        patient_code: maBN,
        booking_date: row.examDate.toISOString().slice(0, 10).replaceAll('-', ''),
      });
      return unpaidBookingSchema.parse(raw).IDDK !== row.hisBookingId;
    } catch (err) {
      if (err instanceof AppError && err.code === 'NOT_FOUND') return true;
      throw err;
    }
  }

  async lookup(actor: AdminPrincipal, input: { token?: string; code?: string }) {
    requireRight(actor, PERMISSIONS.APPOINTMENT_CHECKIN);
    let code = input.code?.toUpperCase();
    if (input.token) {
      const token = input.token.trim();
      code = this.d.verify(token) ?? undefined;
      if (!code) throw new AppError('A06_QR_INVALID');
    }
    if (!code || !/^MQ[A-Z0-9]{6,24}$/.test(code)) throw new AppError('A06_QR_INVALID');
    const row = await this.requireRow(actor, code);
    await this.d.repo.auditView(code, actor.id, row.facilityId);
    return present(row);
  }

  async checkIn(actor: AdminPrincipal, code: string) {
    requireRight(actor, PERMISSIONS.APPOINTMENT_CHECKIN);
    const row = await this.requireRow(actor, code);
    if (row.checkedInAt) throw new AppError('A06_ALREADY_CHECKED_IN');
    const today = formatInTimeZone(this.d.now(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd');
    if (row.status !== 'DA_CO_STT' || row.examDate.toISOString().slice(0, 10) !== today)
      throw new AppError('A06_CHECKIN_NOT_ALLOWED');
    if (!(await this.d.repo.checkIn(code, actor.id, this.d.now())))
      throw new AppError('A06_ALREADY_CHECKED_IN');
    return { code, checkedInAt: this.d.now().toISOString() };
  }

  async csv(actor: AdminPrincipal, query: AppointmentQuery) {
    const lines = [
      'Mã phiếu,Cơ sở,Ngày khám,Khung giờ,Khoa,Phòng,Bệnh nhân,MaBN,STT,Trạng thái,Thanh toán,Kênh,Số tiền',
    ];
    for (let page = 1; ; page++) {
      const batch = await this.list(actor, { ...query, page, pageSize: 100 });
      for (const row of batch.rows)
        lines.push(
          [
            row.code,
            row.facilityName,
            row.examDate,
            row.slotLabel,
            row.specialtyName,
            row.roomName,
            row.patientName,
            row.maBN,
            row.stt,
            row.status,
            row.payMethod,
            row.bookingApi,
            row.amount,
          ]
            .map(safeCsv)
            .join(','),
        );
      if (page * 100 >= batch.total) break;
    }
    return `\uFEFF${lines.join('\r\n')}`;
  }
}
