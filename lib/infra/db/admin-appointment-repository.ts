import type { Prisma } from '@prisma/client';
import { AppError } from '@/lib/domain/errors';
import type { AdminAppointmentFilter, AdminAppointmentRepository } from '@/lib/domain/ports';
import { prisma } from './prisma';

const fields = {
  id: true,
  accountId: true,
  code: true,
  facilityId: true,
  maBN: true,
  isNewPatient: true,
  specialtyName: true,
  doctorName: true,
  roomName: true,
  examDate: true,
  slotLabel: true,
  status: true,
  payMethod: true,
  bookingApi: true,
  objectType: true,
  amount: true,
  stt: true,
  hisBookingId: true,
  hisError: true,
  cancelRequest: true,
  checkedInAt: true,
  paidAt: true,
  createdAt: true,
  facility: { select: { name: true, code: true } },
  account: { select: { fullName: true } },
} as const;

type DbRow = Prisma.AppointmentGetPayload<{ select: typeof fields }>;

function mapRow(row: DbRow) {
  const { facility, account, amount, ...rest } = row;
  return {
    ...rest,
    facilityName: facility.name,
    facilityCode: facility.code,
    patientName: account.fullName,
    amount: Number(amount),
  };
}

function whereFor(filter: AdminAppointmentFilter): Prisma.AppointmentWhereInput {
  return {
    ...(filter.facilityIds !== null ? { facilityId: { in: filter.facilityIds } } : {}),
    ...(filter.facilityId ? { facilityId: filter.facilityId } : {}),
    ...(filter.date ? { examDate: new Date(`${filter.date}T00:00:00Z`) } : {}),
    ...(filter.specialty ? { specialtyName: { contains: filter.specialty, mode: 'insensitive' } } : {}),
    ...(filter.status ? { status: filter.status as Prisma.EnumAppointmentStatusFilter['equals'] } : {}),
    ...(filter.payMethod ? { payMethod: filter.payMethod as Prisma.EnumPayMethodFilter['equals'] } : {}),
    ...(filter.bookingApi ? { bookingApi: filter.bookingApi as Prisma.EnumBookingApiFilter['equals'] } : {}),
    ...(filter.hasHisError ? { status: 'LOI_HIS' } : {}),
    ...(filter.code ? { code: { contains: filter.code, mode: 'insensitive' } } : {}),
  };
}

export const prismaAdminAppointmentRepository: AdminAppointmentRepository = {
  async list(filter) {
    const where = whereFor(filter);
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        select: fields,
        orderBy: [{ examDate: 'desc' }, { createdAt: 'desc' }],
        skip: filter.skip,
        take: filter.take,
      }),
      prisma.appointment.count({ where }),
    ]);
    return { rows: rows.map(mapRow), total };
  },
  async find(code, facilityIds) {
    const row = await prisma.appointment.findFirst({
      where: { code, ...(facilityIds !== null ? { facilityId: { in: facilityIds } } : {}) },
      select: {
        ...fields,
        events: {
          select: { fromStatus: true, toStatus: true, actorType: true, note: true, at: true },
          orderBy: { at: 'asc' },
        },
        outbox: {
          select: {
            command: true,
            attempts: true,
            lastError: true,
            nextRunAt: true,
            doneAt: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!row) return null;
    return { ...mapRow(row), events: row.events, outbox: row.outbox };
  },
  facilities(ids) {
    return prisma.facility.findMany({
      where: ids === null ? {} : { id: { in: ids } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  },
  async retry(code, actorId, at) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      const command = row.maBN ? `POST_BOOKING_${row.bookingApi}` : 'POST_PATIENT_AND_BOOKING';
      const pending = await tx.hisOutbox.findFirst({
        where: { appointmentId: row.id, doneAt: null, command },
        orderBy: { createdAt: 'desc' },
      });
      if (pending) await tx.hisOutbox.update({ where: { id: pending.id }, data: { nextRunAt: at } });
      else
        await tx.hisOutbox.create({
          data: {
            appointmentId: row.id,
            facilityId: row.facilityId,
            // C06 mục 4: worker cần đúng lệnh để tra HIS trước khi gửi lại, nhất là bệnh nhân mới.
            command,
            nextRunAt: at,
          },
        });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: row.status,
          actorType: 'ADMIN',
          actorId,
          note: 'Yêu cầu gửi lại HIS thủ công',
          at,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'RETRY_HIS',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async note(code, actorId, note) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: row.status,
          actorType: 'ADMIN',
          actorId,
          note,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'ADD_NOTE',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async confirmCancel(code, actorId, at, note) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      const next = row.payMethod === 'ONLINE' && row.paidAt ? 'CHO_HOAN_TIEN' : 'DA_HUY';
      const updated = await tx.appointment.updateMany({
        where: {
          id: row.id,
          cancelRequest: true,
          status: { notIn: ['DA_HUY', 'CHO_HOAN_TIEN', 'DA_HOAN_TIEN'] },
        },
        data: { status: next, cancelRequest: false, cancelledAt: at, cancelReason: note },
      });
      if (!updated.count) throw new AppError('A06_CANCEL_REQUEST_REQUIRED');
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: next,
          actorType: 'ADMIN',
          actorId,
          note,
          at,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CONFIRM_CANCEL',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async cancel(code, actorId, at, note) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      const next = row.payMethod === 'ONLINE' && row.paidAt ? 'CHO_HOAN_TIEN' : 'DA_HUY';
      const updated = await tx.appointment.updateMany({
        where: { id: row.id, status: 'DA_CO_STT' },
        data: { status: next, cancelRequest: false, cancelledAt: at, cancelReason: note },
      });
      if (!updated.count) throw new AppError('CANCEL_NOT_ALLOWED');
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: next,
          actorType: 'ADMIN',
          actorId,
          note,
          at,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CANCEL',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async requestCancel(code, actorId, at, note) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      const updated = await tx.appointment.updateMany({
        where: { id: row.id, status: 'DA_CO_STT', cancelRequest: false },
        data: { cancelRequest: true },
      });
      if (!updated.count) throw new AppError('CANCEL_NOT_ALLOWED');
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: row.status,
          actorType: 'ADMIN',
          actorId,
          note: `HIS từ chối hủy; ${note}`,
          at,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'REQUEST_CANCEL',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async setStt(code, actorId, stt, hisBookingId, at) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      const updated = await tx.appointment.updateMany({
        where: { id: row.id, status: { in: ['LOI_HIS', 'DANG_GUI_HIS'] } },
        data: { stt, hisBookingId, sttAt: at, status: 'DA_CO_STT', hisError: null },
      });
      if (!updated.count) throw new AppError('A06_RETRY_NOT_ALLOWED');
      await tx.hisOutbox.updateMany({ where: { appointmentId: row.id, doneAt: null }, data: { doneAt: at } });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: 'DA_CO_STT',
          actorType: 'ADMIN',
          actorId,
          note: 'STT xác nhận từ HIS',
          at,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'SET_STT',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async checkIn(code, actorId, at) {
    return prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      const updated = await tx.appointment.updateMany({
        where: { id: row.id, status: 'DA_CO_STT', checkedInAt: null },
        data: { checkedInAt: at },
      });
      if (!updated.count) return false;
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: row.status,
          actorType: 'ADMIN',
          actorId,
          note: 'Đã đến quầy',
          at,
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'ADMIN',
          actorId,
          action: 'CHECK_IN',
          module: 'APPOINTMENT',
          facilityId: row.facilityId,
          target: code,
        },
      });
      return true;
    });
  },
  async auditView(code, actorId, facilityId) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId,
        action: 'VIEW_APPOINTMENT',
        module: 'APPOINTMENT',
        facilityId,
        target: code,
      },
    });
  },
  async email(code) {
    const row = await prisma.appointment.findUnique({
      where: { code },
      select: { account: { select: { email: true } } },
    });
    return row?.account.email ?? null;
  },
  async auditResend(code, actorId, facilityId) {
    await prisma.auditLog.create({
      data: {
        actorType: 'ADMIN',
        actorId,
        action: 'RESEND_TICKET',
        module: 'APPOINTMENT',
        facilityId,
        target: code,
      },
    });
  },
};
