import type { PiiCipher } from '@/lib/domain/account/ports';
import type {
  BookingAccount,
  BookingRecord,
  BookingRepository,
  CreateBookingRecord,
} from '@/lib/domain/booking/confirm';
import type { AppointmentStatus } from '@/lib/domain/booking/status';
import { prisma } from './prisma';

const active = ['CHO_THANH_TOAN', 'DA_THANH_TOAN', 'DANG_GUI_HIS', 'LOI_HIS', 'DA_CO_STT'] as const;
const detail = {
  facility: { select: { code: true, name: true } },
  payment: { select: { providerTxnId: true, orderCode: true } },
} as const;

async function read(code: string): Promise<BookingRecord | null> {
  const row = await prisma.appointment.findUnique({ where: { code }, include: detail });
  if (!row) return null;
  return {
    ...row,
    facilityCode: row.facility.code,
    facilityName: row.facility.name,
    examDate: row.examDate.toISOString().slice(0, 10),
    amount: Number(row.amount),
    providerTxnId: row.payment?.providerTxnId,
    orderCode: row.payment?.orderCode,
  };
}

export const prismaBookingRepository: BookingRepository = {
  findByCode: read,
  async hasSameDay(accountId, facilityId, date) {
    return (
      (await prisma.appointment.count({
        where: {
          accountId,
          facilityId,
          examDate: new Date(`${date}T00:00:00Z`),
          status: { in: [...active] },
        },
      })) > 0
    );
  },
  async create(input: CreateBookingRecord) {
    const { draft } = input;
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.create({
        data: {
          code: input.code,
          hisId: input.hisId,
          accountId: input.accountId,
          facilityId: input.facilityId,
          maBN: input.maBN,
          isNewPatient: input.isNewPatient,
          specialtyHisId: draft.specialtyHisId,
          specialtyName: draft.specialtyName,
          doctorHisId: draft.doctorHisId,
          doctorName: draft.doctorName,
          roomHisId: draft.roomHisId,
          roomName: draft.roomName,
          examDate: new Date(`${draft.examDate}T00:00:00Z`),
          slotHisId: draft.slotHisId,
          slotLabel: draft.slotLabel,
          bookingNumber: draft.bookingNumber!,
          objectType: draft.objectType,
          payMethod: input.payMethod,
          bookingApi: input.bookingApi,
          amount: draft.amount,
          status: input.status,
        },
      });
      await tx.appointmentEvent.create({
        data: {
          appointmentId: row.id,
          toStatus: input.status,
          actorType: 'PATIENT',
          actorId: input.accountId,
        },
      });
      if (input.payMethod === 'ONLINE') {
        await tx.payment.create({
          data: {
            appointmentId: row.id,
            facilityId: input.facilityId,
            orderCode: input.code,
            amount: draft.amount,
            status: 'PENDING',
          },
        });
      }
    });
    return (await read(input.code))!;
  },
  async setPatient(code, maBN) {
    await prisma.appointment.update({ where: { code }, data: { maBN } });
  },
  async setStatus(code, status: AppointmentStatus, error) {
    await prisma.$transaction(async (tx) => {
      const before = await tx.appointment.findUniqueOrThrow({ where: { code } });
      await tx.appointment.update({ where: { code }, data: { status, hisError: error } });
      await tx.appointmentEvent.create({
        data: { appointmentId: before.id, fromStatus: before.status, toStatus: status, actorType: 'SYSTEM' },
      });
    });
  },
  async setBooked(code, stt, hisBookingId) {
    await prisma.$transaction(async (tx) => {
      const row = await tx.appointment.update({
        where: { code },
        data: { status: 'DA_CO_STT', stt, sttAt: new Date(), hisBookingId, hisError: null },
      });
      await tx.appointmentEvent.create({
        data: { appointmentId: row.id, fromStatus: 'DANG_GUI_HIS', toStatus: 'DA_CO_STT', actorType: 'HIS' },
      });
    });
    return (await read(code))!;
  },
  async enqueueOutbox(row, command) {
    const pending = await prisma.hisOutbox.findFirst({
      where: { appointmentId: row.id, command, doneAt: null },
    });
    if (!pending)
      await prisma.hisOutbox.create({
        data: {
          appointmentId: row.id,
          facilityId: row.facilityId,
          command,
          nextRunAt: new Date(Date.now() + 60_000),
        },
      });
  },
  async dueOutbox(limit) {
    const rows = await prisma.hisOutbox.findMany({
      where: { doneAt: null, nextRunAt: { lte: new Date() } },
      orderBy: { nextRunAt: 'asc' },
      take: limit,
      select: { id: true, command: true, attempts: true, appointment: { select: { code: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.appointment.code,
      command: r.command,
      attempts: r.attempts,
    }));
  },
  async finishOutbox(id) {
    await prisma.hisOutbox.update({ where: { id }, data: { doneAt: new Date() } });
  },
  async deferOutbox(id, attempts, error) {
    const delay = Math.min(2 ** Math.min(attempts, 8) * 60_000, 6 * 60 * 60_000);
    await prisma.hisOutbox.update({
      where: { id },
      data: { attempts, lastError: error, nextRunAt: new Date(Date.now() + delay) },
    });
  },
  async audit(accountId, facilityId, code) {
    await prisma.auditLog.create({
      data: {
        actorType: 'PATIENT',
        actorId: accountId,
        action: 'BOOK',
        module: 'BOOKING',
        facilityId,
        target: code,
      },
    });
  },
};

export function prismaBookingAccount(pii: PiiCipher) {
  return async (accountId: string): Promise<BookingAccount | null> => {
    const row = await prisma.patientAccount.findUnique({
      where: { id: accountId },
      select: {
        fullName: true,
        birthYear: true,
        birthDate: true,
        gender: true,
        phone: true,
        cccdEnc: true,
        email: true,
        addressLine: true,
      },
    });
    if (!row) return null;
    return {
      fullName: row.fullName,
      birthYear: row.birthYear,
      birthDate: row.birthDate?.toISOString().slice(0, 10),
      gender: row.gender,
      phone: row.phone,
      socialId: pii.decrypt(row.cccdEnc),
      email: row.email,
      addressLine: row.addressLine ?? undefined,
    };
  };
}
