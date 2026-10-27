import type { BookingRulesReader } from '@/lib/domain/booking/draft';
import { prisma } from './prisma';

const activeStatuses = ['CHO_THANH_TOAN', 'DA_THANH_TOAN', 'DANG_GUI_HIS', 'LOI_HIS', 'DA_CO_STT'] as const;

// C05 mục 7: đối chiếu phiếu web trước khi chuyển sang xử lý đặt khám.
export const prismaBookingRules: BookingRulesReader = {
  async hasSameDay(accountId, facilityId, date) {
    return (
      (await prisma.appointment.count({
        where: {
          accountId,
          facilityId,
          examDate: new Date(`${date}T00:00:00Z`),
          status: { in: [...activeStatuses] },
        },
      })) > 0
    );
  },
  countUnexamined: (accountId, facilityId) =>
    prisma.appointment.count({ where: { accountId, facilityId, status: { in: [...activeStatuses] } } }),
};
