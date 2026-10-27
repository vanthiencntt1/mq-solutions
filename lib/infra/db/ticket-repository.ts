import type { Prisma } from '@prisma/client';
import { formatInTimeZone } from 'date-fns-tz';
import type { TicketRepository, TicketRow, TicketTab } from '@/lib/domain/booking/cancel-types';
import { prisma } from './prisma';

const ticketInclude = {
  facility: { select: { code: true, name: true, address: true, hotline: true, cancelCutoff: true } },
  account: { select: { fullName: true, birthYear: true, email: true } },
} as const;

type TicketEntity = Prisma.AppointmentGetPayload<{ include: typeof ticketInclude }>;

function toTicket(row: TicketEntity): TicketRow {
  return {
    id: row.id,
    code: row.code,
    accountId: row.accountId,
    facilityId: row.facilityId,
    facilityCode: row.facility.code,
    facilityName: row.facility.name,
    facilityAddress: row.facility.address,
    facilityHotline: row.facility.hotline,
    cancelCutoff: row.facility.cancelCutoff,
    maBN: row.maBN,
    fullName: row.account.fullName,
    birthYear: row.account.birthYear,
    email: row.account.email,
    specialtyName: row.specialtyName,
    doctorName: row.doctorName,
    roomName: row.roomName,
    examDate: row.examDate.toISOString().slice(0, 10),
    slotLabel: row.slotLabel,
    objectType: row.objectType,
    payMethod: row.payMethod,
    bookingApi: row.bookingApi,
    amount: Number(row.amount),
    status: row.status,
    stt: row.stt,
    hisId: row.hisId.toString(),
    hisBookingId: row.hisBookingId,
    paidAt: row.paidAt,
    cancelRequest: row.cancelRequest,
  };
}

const cancelled = ['DA_HUY', 'CHO_HOAN_TIEN', 'DA_HOAN_TIEN'] as const;
const dateValue = (date: string) => new Date(`${date}T00:00:00.000Z`);

function tabWhere(tab: TicketTab, today: string): Prisma.AppointmentWhereInput {
  const date = dateValue(today);
  if (tab === 'cancelled') return { status: { in: [...cancelled] } };
  if (tab === 'past')
    return { status: { notIn: [...cancelled] }, OR: [{ status: 'DA_KHAM' }, { examDate: { lt: date } }] };
  return { status: { notIn: [...cancelled, 'DA_KHAM'] }, examDate: { gte: date } };
}

export const prismaTicketRepository: TicketRepository = {
  async list(accountId, tab, facilityCode, today, page, pageSize) {
    const where: Prisma.AppointmentWhereInput = {
      accountId,
      ...tabWhere(tab, today),
      ...(facilityCode ? { facility: { code: facilityCode } } : {}),
    };
    const [rows, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: ticketInclude,
        orderBy: { examDate: tab === 'upcoming' ? 'asc' : 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.appointment.count({ where }),
    ]);
    return { rows: rows.map(toTicket), total };
  },
  async find(code) {
    const row = await prisma.appointment.findUnique({ where: { code }, include: ticketInclude });
    return row ? toTicket(row) : null;
  },
  async updateStt(code, stt) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      if (row.status !== 'DA_CO_STT' || row.stt === stt) return;
      await tx.appointment.update({ where: { code }, data: { stt, sttAt: new Date() } });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: row.status,
          actorType: 'HIS',
          note: 'STT cập nhật từ HIS',
        },
      });
    });
  },
  async requestCancel(code, accountId) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      if (row.cancelRequest) return;
      await tx.appointment.update({ where: { code }, data: { cancelRequest: true } });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          fromStatus: row.status,
          toStatus: row.status,
          actorType: 'PATIENT',
          actorId: accountId,
          note: 'Yêu cầu cơ sở xử lý hủy do HIS từ chối -46',
        },
      });
      await tx.auditLog.create({
        data: {
          actorType: 'PATIENT',
          actorId: accountId,
          action: 'CANCEL_REQUEST',
          module: 'BOOKING',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async confirmCancel(code, actorType, actorId, reason) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code }, include: { payment: true } });
      if (row.status !== 'DA_CO_STT') return;
      const paid = !!row.paidAt || row.payment?.status === 'PAID';
      const now = new Date();
      await tx.appointment.update({
        where: { code },
        data: {
          status: paid ? 'CHO_HOAN_TIEN' : 'DA_HUY',
          cancelledAt: now,
          cancelReason: reason ?? (actorType === 'HIS' ? 'Cơ sở đã hủy' : null),
          cancelRequest: false,
        },
      });
      await tx.appointmentEvent.create({
        data: { appointmentId: row.id, fromStatus: row.status, toStatus: 'DA_HUY', actorType, actorId },
      });
      if (paid) {
        await tx.appointmentEvent.create({
          data: {
            appointmentId: row.id,
            fromStatus: 'DA_HUY',
            toStatus: 'CHO_HOAN_TIEN',
            actorType,
            actorId,
          },
        });
        if (row.payment && row.payment.status !== 'REFUNDED')
          await tx.payment.update({ where: { id: row.payment.id }, data: { status: 'REFUND_PENDING' } });
      }
      await tx.auditLog.create({
        data: {
          actorType,
          actorId: actorId ?? 'SYSTEM',
          action: 'CANCEL',
          module: 'BOOKING',
          facilityId: row.facilityId,
          target: code,
        },
      });
    });
  },
  async facilitiesForDate(date) {
    const groups = await prisma.appointment.groupBy({
      by: ['facilityId'],
      where: { examDate: dateValue(date), status: 'DA_CO_STT' },
    });
    if (groups.length === 0) return [];
    return prisma.facility.findMany({
      where: { id: { in: groups.map((g) => g.facilityId) } },
      select: { id: true, code: true },
    });
  },
  async activeForDate(facilityId, date) {
    const rows = await prisma.appointment.findMany({
      where: { facilityId, examDate: dateValue(date), status: 'DA_CO_STT' },
      include: ticketInclude,
      take: 1000,
    });
    return rows.map(toTicket);
  },
  async markExamined(code) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.findUniqueOrThrow({ where: { code } });
      if (row.status !== 'DA_CO_STT') return;
      await tx.appointment.update({ where: { code }, data: { status: 'DA_KHAM' } });
      await tx.appointmentEvent.create({
        data: { appointmentId: row.id, fromStatus: 'DA_CO_STT', toStatus: 'DA_KHAM', actorType: 'HIS' },
      });
    });
  },
  async logSync(facilityId, ok, updated, durationMs, error) {
    await prisma.syncLog.create({ data: { facilityId, job: 'STATUS', ok, updated, durationMs, error } });
  },
  async remindCandidates(date) {
    const rows = await prisma.appointment.findMany({
      where: { examDate: dateValue(date), status: 'DA_CO_STT', cancelRequest: false },
      include: ticketInclude,
      take: 1000,
    });
    return rows.map(toTicket);
  },
  async claimReminder(row, now) {
    const link = `/tai-khoan/phieu-kham/${row.code}`;
    // W08: ngày nhắc lịch tính theo giờ Việt Nam, kể cả khi worker chạy gần nửa đêm UTC.
    const start = new Date(`${formatInTimeZone(now, 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd')}T00:00:00+07:00`);
    const current = await prisma.appointment.findUnique({
      where: { id: row.id },
      select: { status: true, cancelRequest: true },
    });
    if (current?.status !== 'DA_CO_STT' || current.cancelRequest) return false;
    const sent = await prisma.notification.findFirst({
      where: { accountId: row.accountId, type: 'REMIND', link, createdAt: { gte: start } },
      select: { id: true },
    });
    if (sent) return false;
    await prisma.notification.create({
      data: {
        accountId: row.accountId,
        type: 'REMIND',
        title: 'Ngày mai bạn có lịch khám',
        body: `Phiếu ${row.code} tại ${row.facilityName}, phòng ${row.roomName}.`,
        link,
      },
    });
    return true;
  },
};
