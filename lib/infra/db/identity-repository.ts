import type { FacilityDirectory, IdentityAccountReader } from '@/lib/domain/identity/ports';
import type { PiiCipher } from '@/lib/domain/account/ports';
import { prisma } from './prisma';

const facilitySelect = { id: true, code: true, name: true, slug: true, status: true } as const;

export const prismaFacilityDirectory: FacilityDirectory = {
  findByCode: (code) => prisma.facility.findUnique({ where: { code }, select: facilitySelect }),

  async listBookedBy(accountId) {
    // Gom theo cơ sở, lấy ngày khám gần nhất; giới hạn số cơ sở hiển thị
    const groups = await prisma.appointment.groupBy({
      by: ['facilityId'],
      where: { accountId },
      _max: { examDate: true },
      orderBy: { _max: { examDate: 'desc' } },
      take: 20,
    });
    if (groups.length === 0) return [];
    const facilities = await prisma.facility.findMany({
      where: { id: { in: groups.map((g) => g.facilityId) }, status: { not: 'INACTIVE' } },
      select: facilitySelect,
    });
    const byId = new Map(facilities.map((f) => [f.id, f]));
    return groups.flatMap((g) => {
      const f = byId.get(g.facilityId);
      return f && g._max.examDate ? [{ ...f, lastExamDate: g._max.examDate }] : [];
    });
  },
};

/** Đọc thông tin tài khoản để đối chiếu HIS: CCCD giải mã tại server, không bao giờ trả về trình duyệt. */
export const prismaIdentityAccounts = (pii: Pick<PiiCipher, 'decrypt'>): IdentityAccountReader => ({
  async load(accountId) {
    const a = await prisma.patientAccount.findUnique({
      where: { id: accountId },
      select: { id: true, cccdEnc: true, phone: true, fullName: true, birthYear: true, status: true },
    });
    if (!a || a.status !== 'ACTIVE') return null;
    return {
      id: a.id,
      cccd: pii.decrypt(a.cccdEnc),
      phone: a.phone,
      fullName: a.fullName,
      birthYear: a.birthYear,
    };
  },
});
